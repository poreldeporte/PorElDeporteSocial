import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { DEFAULT_WAITLIST_LIMIT } from '@my/config/game'
import type { Database } from '@my/supabase/types'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import { fetchDraftStartSnapshot, getDraftStartBlocker, resetDraftForGame, startDraftForGame } from '../services/draft'
import { notifyDraftReady, notifyDraftStarted, notifyGameCancelled, notifyGameCreatedGlobal } from '../services/notifications'
import { ensureAdmin } from '../utils/ensureAdmin'

type GameRow = Database['public']['Tables']['games']['Row']
type QueueRow = Database['public']['Tables']['game_queue']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type CaptainRow = Database['public']['Tables']['game_captains']['Row']
type GameUserStatus = Database['public']['Enums']['game_queue_status'] | 'none'

type QueueWithProfile = QueueRow & {
  profiles: Pick<ProfileRow, 'id' | 'name' | 'avatar_url' | 'jersey_number' | 'position'> | null
}

type GameResultRow = {
  winning_team_id: string | null
  losing_team_id: string | null
  winner_score: number | null
  loser_score: number | null
  status: string | null
  reported_at: string | null
  reported_by: string | null
}

type GameTeamMemberRow = {
  profile_id: string
  pick_order: number | null
  profiles: Pick<ProfileRow, 'id' | 'name' | 'avatar_url' | 'jersey_number' | 'position'> | null
}

type GameTeamRow = {
  id: string
  name: string
  captain_profile_id: string | null
  game_team_members: GameTeamMemberRow[] | null
}

type GameDetailRow = GameRow & {
  game_queue: QueueWithProfile[] | null
  game_captains: (CaptainRow & { profiles: Pick<ProfileRow, 'id' | 'name' | 'avatar_url'> | null })[] | null
  game_results: GameResultRow[] | GameResultRow | null
  game_teams: GameTeamRow[] | null
}

type GameListTeamRow = {
  id: string
  draft_order: number
  profiles: Pick<ProfileRow, 'id' | 'name'> | null
}

type GameListRow = GameRow & {
  game_captains: Pick<CaptainRow, 'profile_id'>[] | null
  game_results?: GameResultRow[] | GameResultRow | null
  game_teams?: GameListTeamRow[] | null
}

const publicGameFields = `
  id,
  name,
  description,
  start_time,
  end_time,
  location_name,
  location_notes,
  status,
  draft_status,
  cost_cents,
  capacity,
  waitlist_capacity,
  cancelled_at,
  created_by
`

const listSelect = `
  ${publicGameFields},
  game_captains (
    profile_id
  )
`

const listHistorySelect = `
  ${publicGameFields},
  game_captains (
    profile_id
  ),
  game_results (
    winning_team_id,
    losing_team_id,
    winner_score,
    loser_score,
    status
  ),
  game_teams (
    id,
    draft_order,
    profiles!game_teams_captain_profile_id_fkey (
      id,
      name
    )
  )
`

const listInput = z.object({
  scope: z.enum(['upcoming', 'past']).default('upcoming'),
})

const createGameInput = z.object({
  name: z.string().min(3),
  description: z.string().nullable().optional(),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  locationName: z.string().nullable().optional(),
  locationNotes: z.string().nullable().optional(),
  cost: z.number().min(0),
  capacity: z.number().int().positive(),
})

const updateGameInput = createGameInput
  .partial()
  .extend({
    id: z.string().uuid(),
    status: z.enum(['scheduled', 'locked', 'completed', 'cancelled']).optional(),
  })

export const gamesRouter = createTRPCRouter({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const nowIso = new Date().toISOString()
    const query = ctx.supabase
      .from('games')
      .select(input.scope === 'past' ? listHistorySelect : listSelect)
      .limit(50)
    if (input.scope === 'past') {
      query.lte('start_time', nowIso).order('start_time', { ascending: false })
    } else {
      query.gte('start_time', nowIso).order('start_time', { ascending: true })
    }
    const { data, error } = await query

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    const rows = (data ?? []) as GameListRow[]
    if (rows.length === 0) return []

    const { data: statsData, error: statsError } = await ctx.supabase.rpc('get_game_statistics', {
      p_game_ids: rows.map((game) => game.id),
      p_profile_id: ctx.user.id,
    })

    if (statsError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: statsError.message })
    }

    const statsMap = new Map(
      (statsData ?? []).map((stat) => [
        stat.game_id,
        {
          confirmedCount: stat.confirmed_count ?? 0,
          waitlistedCount: stat.waitlisted_count ?? 0,
          attendanceConfirmedCount: stat.attendance_confirmed_count ?? 0,
          userStatus: (stat.user_status as GameUserStatus | null) ?? 'none',
          attendanceConfirmedAt: stat.user_attendance_confirmed_at ?? null,
        },
      ])
    )

    return rows.map((game) => {
      const stats = statsMap.get(game.id)
      const rawResult = Array.isArray(game.game_results)
        ? game.game_results[0] ?? null
        : game.game_results ?? null
      const teamCaptains = (game.game_teams ?? [])
        .map((team) => ({
          id: team.id,
          draftOrder: team.draft_order,
          captainName: team.profiles?.name ?? null,
        }))
        .sort((a, b) => a.draftOrder - b.draftOrder)
      return {
        id: game.id,
        name: game.name,
        description: game.description,
        startTime: game.start_time,
        endTime: game.end_time,
        locationName: game.location_name,
        locationNotes: game.location_notes,
        status: game.status,
        draftStatus: game.draft_status,
        costCents: game.cost_cents,
        capacity: game.capacity,
        waitlistCapacity: game.waitlist_capacity,
        attendanceConfirmedCount: stats?.attendanceConfirmedCount ?? 0,
        confirmedCount: stats?.confirmedCount ?? 0,
        waitlistedCount: stats?.waitlistedCount ?? 0,
        userStatus: stats?.userStatus ?? 'none',
        attendanceConfirmedAt: stats?.attendanceConfirmedAt ?? null,
        result: rawResult
          ? {
              winningTeamId: rawResult.winning_team_id,
              losingTeamId: rawResult.losing_team_id,
              winnerScore: rawResult.winner_score,
              loserScore: rawResult.loser_score,
              status: rawResult.status,
            }
          : null,
        teamCaptains,
        cancelledAt: game.cancelled_at,
        captainIds: (game.game_captains ?? []).map((captain) => captain.profile_id),
      }
    })
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('games')
        .select(
          `
          ${publicGameFields},
          game_queue (
            id,
            profile_id,
            status,
            joined_at,
            promoted_at,
            cancelled_at,
            attendance_confirmed_at,
            profiles (
              id,
              name,
              avatar_url,
              jersey_number,
              position
            )
          ),
          game_captains (
            slot,
            profile_id,
            profiles (
              id,
              name,
              avatar_url,
              jersey_number
            )
          ),
          game_results (
            winning_team_id,
            losing_team_id,
            winner_score,
            loser_score,
            status,
            reported_at,
            reported_by
          ),
          game_teams (
            id,
            name,
            captain_profile_id,
            game_team_members (
              profile_id,
              pick_order,
            profiles!game_team_members_profile_id_fkey (
              id,
              name,
              avatar_url,
              jersey_number,
              position
              )
            )
          )
        `
        )
        .eq('id', input.id)
        .maybeSingle()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      if (!data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
      }

      const game = data as GameDetailRow
      const baseQueue = (game.game_queue ?? []).map((entry) => ({
        id: entry.id,
        status: entry.status,
        joinedAt: entry.joined_at,
        promotedAt: entry.promoted_at,
        cancelledAt: entry.cancelled_at,
        profileId: entry.profile_id,
        attendanceConfirmedAt: entry.attendance_confirmed_at,
        player: {
          id: entry.profiles?.id ?? entry.profile_id,
          name: entry.profiles?.name ?? null,
          avatarUrl: entry.profiles?.avatar_url ?? null,
          jerseyNumber: entry.profiles?.jersey_number ?? null,
          position: entry.profiles?.position ?? null,
        },
      }))
      const profileIdSet = new Set(baseQueue.map((entry) => entry.profileId))
      let recordMap = new Map<string, { wins: number; losses: number; recent: string[] }>()
      if (profileIdSet.size > 0) {
        const { data: recordRows, error: recordError } = await ctx.supabase.rpc('get_player_recent_records', {
          p_profile_ids: Array.from(profileIdSet),
        })
        if (recordError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: recordError.message })
        }
        recordMap = new Map(
          (recordRows ?? []).map((row) => [row.profile_id, {
            wins: row.wins ?? 0,
            losses: row.losses ?? 0,
            recent: row.recent_outcomes ?? [],
          }])
        )
      }
      const queue = baseQueue.map((entry) => {
        const record = recordMap.get(entry.profileId)
        return {
          ...entry,
          record: record ?? { wins: 0, losses: 0, recent: [] },
        }
      })

      const captains = (game.game_captains ?? []).map((captain) => ({
        slot: captain.slot,
        profileId: captain.profile_id,
        player: {
          id: captain.profiles?.id ?? captain.profile_id,
          name: captain.profiles?.name ?? null,
          avatarUrl: captain.profiles?.avatar_url ?? null,
          jerseyNumber: captain.profiles?.jersey_number ?? null,
        },
      }))
      const teams = (game.game_teams ?? []).map((team) => ({
        id: team.id,
        name: team.name,
        captainProfileId: team.captain_profile_id,
        members: (team.game_team_members ?? [])
          .map((member) => ({
            profileId: member.profile_id,
            pickOrder: member.pick_order,
            player: {
              id: member.profiles?.id ?? member.profile_id,
              name: member.profiles?.name ?? null,
              avatarUrl: member.profiles?.avatar_url ?? null,
              jerseyNumber: member.profiles?.jersey_number ?? null,
              position: member.profiles?.position ?? null,
            },
          }))
          .sort((a, b) => {
            const aOrder = typeof a.pickOrder === 'number' ? a.pickOrder : Number.MAX_SAFE_INTEGER
            const bOrder = typeof b.pickOrder === 'number' ? b.pickOrder : Number.MAX_SAFE_INTEGER
            return aOrder - bOrder
          }),
      }))
      const rawResult = Array.isArray(game.game_results)
        ? game.game_results[0] ?? null
        : game.game_results ?? null

      const confirmedCount = queue.filter((entry) => entry.status === 'confirmed').length
      const waitlistedCount = queue.filter((entry) => entry.status === 'waitlisted').length
      const userEntry = queue.find((entry) => entry.profileId === ctx.user.id)
      const userStatus = (userEntry?.status as GameUserStatus | null) ?? 'none'

      return {
        id: game.id,
        name: game.name,
        description: game.description,
        startTime: game.start_time,
        endTime: game.end_time,
        locationName: game.location_name,
        locationNotes: game.location_notes,
        status: game.status,
        draftStatus: game.draft_status,
        costCents: game.cost_cents,
        capacity: game.capacity,
        waitlistCapacity: game.waitlist_capacity,
        result: rawResult
          ? {
              winningTeamId: rawResult.winning_team_id,
              losingTeamId: rawResult.losing_team_id,
              winnerScore: rawResult.winner_score,
              loserScore: rawResult.loser_score,
              status: rawResult.status,
              reportedAt: rawResult.reported_at,
              reportedBy: rawResult.reported_by,
            }
          : null,
        queue,
        captains,
        teams,
        confirmedCount,
        waitlistedCount,
        userStatus,
        userEntry,
        cancelledAt: game.cancelled_at,
      }
    }),

  create: protectedProcedure.input(createGameInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const { data, error } = await ctx.supabase
      .from('games')
      .insert({
        name: input.name,
        description: input.description ?? null,
        start_time: input.startTime,
        end_time: input.endTime ?? null,
        location_name: input.locationName ?? null,
        location_notes: input.locationNotes ?? null,
        cost_cents: Math.round(input.cost * 100),
        capacity: input.capacity,
        waitlist_capacity: DEFAULT_WAITLIST_LIMIT,
        created_by: ctx.user.id,
      })
      .select(publicGameFields)
      .maybeSingle()

    if (error || !data) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Unable to create game' })
    }

    try {
      await notifyGameCreatedGlobal({ supabaseAdmin, gameId: data.id })
    } catch {}

    return data
  }),

  update: protectedProcedure.input(updateGameInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const payload: Database['public']['Tables']['games']['Update'] = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.description !== undefined) payload.description = input.description
    if (input.startTime !== undefined) payload.start_time = input.startTime
    if (input.endTime !== undefined) payload.end_time = input.endTime
    if (input.locationName !== undefined) payload.location_name = input.locationName
    if (input.locationNotes !== undefined) payload.location_notes = input.locationNotes
    if (input.cost !== undefined) payload.cost_cents = Math.round(input.cost * 100)
    if (input.capacity !== undefined) payload.capacity = input.capacity
    if (input.status !== undefined) payload.status = input.status

    const { data, error } = await ctx.supabase
      .from('games')
      .update(payload)
      .eq('id', input.id)
      .select(publicGameFields)
      .maybeSingle()

    if (error || !data) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Unable to update game' })
    }

    return data
  }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ensureAdmin(ctx.supabase, ctx.user.id)
      const now = new Date().toISOString()

      const { data, error } = await ctx.supabase
        .from('games')
        .update({
          status: 'cancelled',
          cancelled_at: now,
        })
        .eq('id', input.id)
        .select(publicGameFields)
        .maybeSingle()

      if (error || !data) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Unable to cancel game' })
    }

    try {
      await notifyGameCancelled({ supabaseAdmin, gameId: data.id })
    } catch {}

    return data
  }),

  assignCaptains: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        captains: z.array(z.object({ profileId: z.string().uuid() })).min(2),
        teamNames: z.array(z.string().min(1)).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ensureAdmin(ctx.supabase, ctx.user.id)

      const snapshot = await fetchDraftStartSnapshot(ctx.supabase, input.gameId)

      const captainIds = input.captains.map((captain) => captain.profileId)
      const captainSet = new Set(captainIds)
      if (captainSet.size !== captainIds.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Captains must be unique' })
      }
      if (input.teamNames && input.teamNames.length !== captainIds.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Team names must match captain count' })
      }

      const blocker = getDraftStartBlocker({ snapshot, captainCount: captainIds.length })
      if (blocker) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: blocker })
      }

      const { data: captainRows, error: captainCheckError } = await ctx.supabase
        .from('game_queue')
        .select('profile_id, attendance_confirmed_at')
        .eq('game_id', input.gameId)
        .in('profile_id', captainIds)
        .eq('status', 'confirmed')

      if (captainCheckError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: captainCheckError.message })
      }

      const readyCaptains = (captainRows ?? []).filter((row) => row.attendance_confirmed_at)
      if (readyCaptains.length !== captainIds.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Captains must be confirmed before drafting' })
      }

      const payload = input.captains.map((captain, index) => ({
        game_id: input.gameId,
        profile_id: captain.profileId,
        slot: index + 1,
      }))

      const { error: deleteError } = await ctx.supabase.from('game_captains').delete().eq('game_id', input.gameId)
      if (deleteError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteError.message })
      }

      const { error } = await ctx.supabase
        .from('game_captains')
        .insert(payload)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      const { data: readyGame, error: readyError } = await supabaseAdmin
        .from('games')
        .update({ draft_status: 'ready' })
        .eq('id', input.gameId)
        .eq('draft_status', 'pending')
        .select('id')
        .maybeSingle()

      if (readyError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: readyError.message })
      }

      if (!readyGame) {
        return { ok: true, draftStatus: 'in_progress' as const }
      }

      try {
        await notifyDraftReady({ supabaseAdmin, gameId: input.gameId })
      } catch {}

      await startDraftForGame({
        gameId: input.gameId,
        teamNames: input.teamNames,
        captainProfileIds: captainIds,
        supabaseAuthed: ctx.supabase,
        supabaseAdmin,
        actorId: ctx.user.id,
      })

      try {
        await notifyDraftStarted({ supabaseAdmin, gameId: input.gameId })
      } catch {}

      return { ok: true, draftStatus: 'in_progress' as const }
    }),

  clearCaptains: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ensureAdmin(ctx.supabase, ctx.user.id)

      await resetDraftForGame({
        gameId: input.gameId,
        supabaseAdmin,
        actorId: ctx.user.id,
        preserveCaptains: false,
      })

      return { ok: true }
    }),
})
