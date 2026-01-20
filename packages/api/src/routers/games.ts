import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import type { Database } from '@my/supabase/types'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import { fetchDraftStartSnapshot, getDraftStartBlocker, resetDraftForGame } from '../services/draft'
import { rollbackCommunityRatingForGame } from '../services/community-rating'
import {
  notifyCaptainsAssigned,
  notifyGameCancelled,
  notifyGuestNeedsConfirmation,
  notifyWaitlistDemoted,
  notifyWaitlistPromoted,
} from '../services/notifications'
import { ensureAdmin } from '../utils/ensureAdmin'
import { formatProfileName } from '../utils/profileName'

type GameRow = Database['public']['Tables']['games']['Row']
type QueueRow = Database['public']['Tables']['game_queue']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type CaptainRow = Database['public']['Tables']['game_captains']['Row']
type CommunityRow = Database['public']['Tables']['communities']['Row']
type GameUserStatus = Database['public']['Enums']['game_queue_status'] | 'none'

type CommunitySummary = Pick<
  CommunityRow,
  | 'id'
  | 'community_timezone'
  | 'community_priority_enabled'
  | 'confirmation_window_hours_before_kickoff'
  | 'confirmation_reminders_local_times'
  | 'crunch_time_enabled'
  | 'crunch_time_start_time_local'
  | 'game_notification_times_local'
>

type QueueWithProfile = QueueRow & {
  guest_name: string | null
  guest_phone: string | null
  guest_notes: string | null
  guest_rating: number | null
  added_by_profile_id: string | null
  added_by: Pick<ProfileRow, 'id' | 'name' | 'first_name' | 'last_name'> | null
  profiles: Pick<
    ProfileRow,
    | 'id'
    | 'name'
    | 'first_name'
    | 'last_name'
    | 'avatar_url'
    | 'phone'
    | 'nationality'
    | 'jersey_number'
    | 'position'
  > | null
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
  profile_id: string | null
  guest_queue_id: string | null
  pick_order: number | null
  profiles: Pick<
    ProfileRow,
    'id' | 'name' | 'first_name' | 'last_name' | 'avatar_url' | 'jersey_number' | 'position'
  > | null
  game_queue: {
    id: string
    guest_name: string | null
    guest_phone: string | null
    guest_notes: string | null
    added_by_profile_id: string | null
  } | null
}

type GameTeamRow = {
  id: string
  name: string
  captain_profile_id: string | null
  game_team_members: GameTeamMemberRow[] | null
}

type GameDetailRow = GameRow & {
  communities: CommunitySummary | null
  game_queue: QueueWithProfile[] | null
  game_captains: (CaptainRow & {
    profiles: Pick<ProfileRow, 'id' | 'name' | 'first_name' | 'last_name' | 'avatar_url'> | null
  })[] | null
  game_results: GameResultRow[] | GameResultRow | null
  game_teams: GameTeamRow[] | null
}

type GameListTeamRow = {
  id: string
  draft_order: number
  profiles: Pick<ProfileRow, 'id' | 'name' | 'first_name' | 'last_name'> | null
}

type GameListRow = GameRow & {
  communities: CommunitySummary | null
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
  release_at,
  released_at,
  audience_group_id,
  location_name,
  location_notes,
  status,
  draft_status,
  cost_cents,
  capacity,
  cancelled_at,
  created_by,
  community_id,
  confirmation_enabled,
  join_cutoff_offset_minutes_from_kickoff,
  draft_mode_enabled,
  draft_style,
  draft_visibility,
  draft_chat_enabled,
  crunch_time_start_time_local
`

const communityFields = `
  communities!games_community_id_fkey (
    id,
    community_timezone,
    community_priority_enabled,
    confirmation_window_hours_before_kickoff,
    confirmation_reminders_local_times,
    crunch_time_enabled,
    crunch_time_start_time_local,
    game_notification_times_local
  )
`

const listSelect = `
  ${publicGameFields},
  ${communityFields},
  game_captains (
    profile_id
  )
`

const listHistorySelect = `
  ${publicGameFields},
  ${communityFields},
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
      name,
      first_name,
      last_name
    )
  )
`

const listInput = z.object({
  scope: z.enum(['upcoming', 'past']).default('upcoming'),
})

const draftStyleEnum = z.enum(['snake', 'original', 'auction'])
const MAX_CAPTAIN_VOTES = 2

const validateReleaseBeforeKickoff = (
  values: { releaseAt?: string | null; startTime?: string | null },
  ctx: z.RefinementCtx
) => {
  if (!values.releaseAt || !values.startTime) return
  const releaseAt = new Date(values.releaseAt).getTime()
  const startAt = new Date(values.startTime).getTime()
  if (Number.isNaN(releaseAt) || Number.isNaN(startAt)) return
  if (releaseAt > startAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Release time must be before kickoff.',
      path: ['releaseAt'],
    })
  }
}

const createGameBase = z.object({
  name: z.string().min(3),
  description: z.string().nullable().optional(),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  releaseAt: z.string().nullable().optional(),
  audienceGroupId: z.string().uuid().nullable().optional(),
  locationName: z.string().nullable().optional(),
  locationNotes: z.string().nullable().optional(),
  cost: z.number().min(0),
  capacity: z.number().int().positive(),
  confirmationEnabled: z.boolean().optional(),
  joinCutoffOffsetMinutesFromKickoff: z.number().int().min(0).optional(),
  draftModeEnabled: z.boolean().optional(),
  draftVisibility: z.enum(['public', 'admin_only']).optional(),
  draftChatEnabled: z.boolean().optional(),
  crunchTimeStartTimeLocal: z.string().nullable().optional(),
})

const createGameInput = createGameBase.superRefine(validateReleaseBeforeKickoff)

const updateGameInput = createGameBase
  .partial()
  .extend({
    id: z.string().uuid(),
    status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
    confirmationEnabled: z.boolean().optional(),
    joinCutoffOffsetMinutesFromKickoff: z.number().int().min(0).optional(),
    draftModeEnabled: z.boolean().optional(),
    draftVisibility: z.enum(['public', 'admin_only']).optional(),
    draftChatEnabled: z.boolean().optional(),
    crunchTimeStartTimeLocal: z.string().nullable().optional(),
  })
  .superRefine(validateReleaseBeforeKickoff)

export const gamesRouter = createTRPCRouter({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const isAdmin = await isUserAdmin(ctx.supabase, ctx.user.id)
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
    if (!isAdmin) {
      query.or('release_at.is.null,released_at.not.is.null')
      const groupIds = await fetchUserGroupIds(ctx.supabase, ctx.user.id)
      if (groupIds.length === 0) {
        query.is('audience_group_id', null)
      } else {
        query.or(`audience_group_id.is.null,audience_group_id.in.(${groupIds.join(',')})`)
      }
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
          rosteredCount: stat.rostered_count ?? 0,
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
          captainName: formatProfileName(team.profiles, null),
        }))
        .sort((a, b) => a.draftOrder - b.draftOrder)
      return {
        id: game.id,
        name: game.name,
        description: game.description,
        startTime: game.start_time,
        endTime: game.end_time,
        releaseAt: game.release_at,
        releasedAt: game.released_at,
        audienceGroupId: game.audience_group_id ?? null,
        locationName: game.location_name,
        locationNotes: game.location_notes,
        status: game.status,
        draftStatus: game.draft_status,
        costCents: game.cost_cents,
        capacity: game.capacity,
        attendanceConfirmedCount: stats?.attendanceConfirmedCount ?? 0,
        rosteredCount: stats?.rosteredCount ?? 0,
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
        communityId: game.community_id,
        confirmationEnabled: game.confirmation_enabled,
        joinCutoffOffsetMinutesFromKickoff: game.join_cutoff_offset_minutes_from_kickoff,
        draftModeEnabled: game.draft_mode_enabled,
        draftStyle: game.draft_style,
        draftVisibility: game.draft_visibility,
        draftChatEnabled: game.draft_chat_enabled,
        crunchTimeStartTimeLocal: game.crunch_time_start_time_local,
        community: game.communities
          ? {
              id: game.communities.id,
              timezone: game.communities.community_timezone,
              communityPriorityEnabled: game.communities.community_priority_enabled,
              confirmationWindowHoursBeforeKickoff:
                game.communities.confirmation_window_hours_before_kickoff,
              confirmationRemindersLocalTimes: game.communities.confirmation_reminders_local_times,
              crunchTimeEnabled: game.communities.crunch_time_enabled,
              crunchTimeStartTimeLocal: game.communities.crunch_time_start_time_local,
              gameNotificationTimesLocal: game.communities.game_notification_times_local,
            }
          : null,
        captainIds: (game.game_captains ?? []).map((captain) => captain.profile_id),
      }
    })
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const isAdmin = await isUserAdmin(ctx.supabase, ctx.user.id)
      const { data, error } = await ctx.supabase
        .from('games')
        .select(
          `
          ${publicGameFields},
          ${communityFields},
          game_queue (
            id,
            profile_id,
            status,
            joined_at,
            promoted_at,
            dropped_at,
            attendance_confirmed_at,
            no_show_at,
            no_show_by,
            tardy_at,
            tardy_by,
            guest_name,
            guest_phone,
            guest_notes,
            guest_rating,
            added_by_profile_id,
            added_by:profiles!game_queue_added_by_profile_id_fkey (
              id,
              name,
              first_name,
              last_name
            ),
            profiles!game_queue_profile_id_fkey (
              id,
              name,
              first_name,
              last_name,
              avatar_url,
              phone,
              nationality,
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
              first_name,
              last_name,
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
              guest_queue_id,
              pick_order,
              profiles!game_team_members_profile_id_fkey (
                id,
                name,
                first_name,
                last_name,
                avatar_url,
                jersey_number,
                position
              ),
              game_queue!game_team_members_guest_queue_id_fkey (
                id,
                guest_name,
                guest_phone,
                guest_notes,
                added_by_profile_id
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
      if (!isAdmin && game.release_at && !game.released_at) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
      }
      const audienceGroupId = game.audience_group_id ?? null
      if (!isAdmin && audienceGroupId) {
        const inGroup = await isProfileInGroup(ctx.supabase, audienceGroupId, ctx.user.id)
        if (!inGroup) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
        }
      }
      const baseQueue = (game.game_queue ?? []).map((entry) => {
        const isGuest = !entry.profile_id
        const playerId = entry.profile_id ?? entry.id
        const guest =
          isGuest
            ? {
                name: entry.guest_name ?? 'Guest',
                phone: entry.guest_phone ?? null,
                notes: entry.guest_notes ?? null,
                rating: entry.guest_rating ?? null,
                addedByProfileId: entry.added_by_profile_id ?? null,
                addedByName: formatProfileName(entry.added_by, null),
              }
            : null
        const playerName = isGuest ? guest?.name ?? 'Guest' : formatProfileName(entry.profiles, null)
        return {
          id: entry.id,
          status: entry.status,
          joinedAt: entry.joined_at,
          promotedAt: entry.promoted_at,
          droppedAt: entry.dropped_at,
          profileId: entry.profile_id,
          noShowAt: entry.no_show_at,
          noShowBy: entry.no_show_by,
          tardyAt: entry.tardy_at,
          tardyBy: entry.tardy_by,
          playerId,
          isGuest,
          guest,
          attendanceConfirmedAt: entry.attendance_confirmed_at,
          player: {
            id: playerId,
            name: playerName,
            avatarUrl: entry.profiles?.avatar_url ?? null,
            phone: entry.profiles?.phone ?? null,
            nationality: entry.profiles?.nationality ?? null,
            jerseyNumber: entry.profiles?.jersey_number ?? null,
            position: entry.profiles?.position ?? null,
          },
        }
      })
      const profileIds = baseQueue
        .map((entry) => entry.profileId)
        .filter((profileId): profileId is string => Boolean(profileId))
      const profileIdSet = new Set(profileIds)
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
        if (!entry.profileId) {
          return {
            ...entry,
            record: null,
          }
        }
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
          name: formatProfileName(captain.profiles, null),
          avatarUrl: captain.profiles?.avatar_url ?? null,
          jerseyNumber: captain.profiles?.jersey_number ?? null,
        },
      }))
      const teams = (game.game_teams ?? []).map((team) => ({
        id: team.id,
        name: team.name,
        captainProfileId: team.captain_profile_id,
        members: (team.game_team_members ?? [])
          .map((member) => {
            const isGuest = !member.profile_id && Boolean(member.guest_queue_id)
            const guest =
              isGuest
                ? {
                    name: member.game_queue?.guest_name ?? 'Guest',
                    phone: member.game_queue?.guest_phone ?? null,
                    notes: member.game_queue?.guest_notes ?? null,
                    addedByProfileId: member.game_queue?.added_by_profile_id ?? null,
                  }
                : null
            const playerId =
              member.profile_id ?? member.guest_queue_id ?? member.game_queue?.id ?? null
            const playerName = isGuest ? guest?.name ?? 'Guest' : formatProfileName(member.profiles, null)
            return {
              profileId: member.profile_id,
              guestQueueId: member.guest_queue_id,
              isGuest,
              guest,
              pickOrder: member.pick_order,
              player: {
                id: playerId ?? member.profile_id ?? member.guest_queue_id ?? '',
                name: playerName,
                avatarUrl: isGuest ? null : member.profiles?.avatar_url ?? null,
                jerseyNumber: isGuest ? null : member.profiles?.jersey_number ?? null,
                position: isGuest ? null : member.profiles?.position ?? null,
              },
            }
          })
          .sort((a, b) => {
            const aOrder = typeof a.pickOrder === 'number' ? a.pickOrder : Number.MAX_SAFE_INTEGER
            const bOrder = typeof b.pickOrder === 'number' ? b.pickOrder : Number.MAX_SAFE_INTEGER
            return aOrder - bOrder
          }),
      }))
      const rawResult = Array.isArray(game.game_results)
        ? game.game_results[0] ?? null
        : game.game_results ?? null

      const rosteredCount = queue.filter((entry) => entry.status === 'rostered').length
      const waitlistedCount = queue.filter((entry) => entry.status === 'waitlisted').length
      const userEntry = queue.find((entry) => entry.profileId === ctx.user.id)
      const userStatus = (userEntry?.status as GameUserStatus | null) ?? 'none'
      const { data: reviewRow, error: reviewError } = await supabaseAdmin
        .from('game_reviews')
        .select('id')
        .eq('game_id', input.id)
        .eq('profile_id', ctx.user.id)
        .maybeSingle()

      if (reviewError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: reviewError.message })
      }
      const hasReview = Boolean(reviewRow)

      return {
        id: game.id,
        name: game.name,
        description: game.description,
        startTime: game.start_time,
        endTime: game.end_time,
        releaseAt: game.release_at,
        releasedAt: game.released_at,
        audienceGroupId,
        locationName: game.location_name,
        locationNotes: game.location_notes,
        status: game.status,
        draftStatus: game.draft_status,
        costCents: game.cost_cents,
        capacity: game.capacity,
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
        rosteredCount,
        waitlistedCount,
        userStatus,
        userEntry,
        hasReview,
        cancelledAt: game.cancelled_at,
        communityId: game.community_id,
        confirmationEnabled: game.confirmation_enabled,
        joinCutoffOffsetMinutesFromKickoff: game.join_cutoff_offset_minutes_from_kickoff,
        draftModeEnabled: game.draft_mode_enabled,
        draftStyle: game.draft_style,
        draftVisibility: game.draft_visibility,
        draftChatEnabled: game.draft_chat_enabled,
        crunchTimeStartTimeLocal: game.crunch_time_start_time_local,
        community: game.communities
          ? {
              id: game.communities.id,
              timezone: game.communities.community_timezone,
              communityPriorityEnabled: game.communities.community_priority_enabled,
              confirmationWindowHoursBeforeKickoff:
                game.communities.confirmation_window_hours_before_kickoff,
              confirmationRemindersLocalTimes: game.communities.confirmation_reminders_local_times,
              crunchTimeEnabled: game.communities.crunch_time_enabled,
              crunchTimeStartTimeLocal: game.communities.crunch_time_start_time_local,
              gameNotificationTimesLocal: game.communities.game_notification_times_local,
            }
          : null,
      }
    }),

  captainVotes: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rosteredProfileIds = await fetchRosteredProfileIds(ctx.supabase, input.gameId)
      if (rosteredProfileIds.length === 0) {
        return { counts: {}, myVotes: [], limit: MAX_CAPTAIN_VOTES }
      }

      const { data, error } = await ctx.supabase
        .from('game_captain_votes')
        .select('nominee_profile_id, voter_profile_id')
        .eq('game_id', input.gameId)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      const rosteredSet = new Set(rosteredProfileIds)
      const counts: Record<string, number> = {}
      const myVotes: string[] = []

      ;(data ?? []).forEach((row) => {
        const nomineeId = row.nominee_profile_id
        if (!nomineeId || !rosteredSet.has(nomineeId)) return
        counts[nomineeId] = (counts[nomineeId] ?? 0) + 1
        if (row.voter_profile_id === ctx.user.id) {
          myVotes.push(nomineeId)
        }
      })

      return { counts, myVotes, limit: MAX_CAPTAIN_VOTES }
    }),

  toggleCaptainVote: protectedProcedure
    .input(z.object({ gameId: z.string().uuid(), nomineeProfileId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: game, error: gameError } = await ctx.supabase
        .from('games')
        .select('id, draft_status, draft_mode_enabled')
        .eq('id', input.gameId)
        .maybeSingle()

      if (gameError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: gameError.message })
      }
      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
      }
      if (game.draft_mode_enabled === false) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Draft mode is off for this game' })
      }
      if (game.draft_status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Captain voting is closed' })
      }
      if (input.nomineeProfileId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot vote for yourself' })
      }

      const rosteredProfileIds = await fetchRosteredProfileIds(ctx.supabase, input.gameId)
      const rosteredSet = new Set(rosteredProfileIds)
      if (!rosteredSet.has(input.nomineeProfileId)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nominee must be rostered' })
      }

      const { data: existing, error: existingError } = await ctx.supabase
        .from('game_captain_votes')
        .select('id')
        .eq('game_id', input.gameId)
        .eq('voter_profile_id', ctx.user.id)
        .eq('nominee_profile_id', input.nomineeProfileId)
        .maybeSingle()

      if (existingError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: existingError.message })
      }

      if (existing?.id) {
        const { error: deleteError } = await ctx.supabase
          .from('game_captain_votes')
          .delete()
          .eq('id', existing.id)

        if (deleteError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteError.message })
        }

        return { action: 'removed' as const }
      }

      const { count, error: countError } = await ctx.supabase
        .from('game_captain_votes')
        .select('id', { count: 'exact', head: true })
        .eq('game_id', input.gameId)
        .eq('voter_profile_id', ctx.user.id)

      if (countError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: countError.message })
      }

      if ((count ?? 0) >= MAX_CAPTAIN_VOTES) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You can only vote for two captains' })
      }

      const { error: insertError } = await ctx.supabase.from('game_captain_votes').insert({
        game_id: input.gameId,
        voter_profile_id: ctx.user.id,
        nominee_profile_id: input.nomineeProfileId,
      })

      if (insertError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message })
      }

      return { action: 'added' as const }
    }),

  create: protectedProcedure.input(createGameInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const { data: communityRow, error: communityError } = await ctx.supabase
      .from('communities')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (communityError || !communityRow) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Unable to load community defaults' })
    }

    if (input.audienceGroupId) {
      await ensureGroupInCommunity({ groupId: input.audienceGroupId, communityId: communityRow.id })
    }

    const payload: Database['public']['Tables']['games']['Insert'] = {
      name: input.name,
      description: input.description ?? null,
      start_time: input.startTime,
      end_time: input.endTime ?? null,
      release_at: input.releaseAt ?? null,
      audience_group_id: input.audienceGroupId ?? null,
      location_name: input.locationName ?? null,
      location_notes: input.locationNotes ?? null,
      cost_cents: Math.round(input.cost * 100),
      capacity: input.capacity,
      created_by: ctx.user.id,
      community_id: communityRow.id,
    }

    if (input.confirmationEnabled !== undefined) payload.confirmation_enabled = input.confirmationEnabled
    if (input.joinCutoffOffsetMinutesFromKickoff !== undefined) {
      payload.join_cutoff_offset_minutes_from_kickoff = input.joinCutoffOffsetMinutesFromKickoff
    }
    if (input.draftModeEnabled !== undefined) payload.draft_mode_enabled = input.draftModeEnabled
    if (input.draftVisibility !== undefined) payload.draft_visibility = input.draftVisibility
    if (input.draftChatEnabled !== undefined) payload.draft_chat_enabled = input.draftChatEnabled
    if (input.crunchTimeStartTimeLocal !== undefined) {
      payload.crunch_time_start_time_local = input.crunchTimeStartTimeLocal
    }
    if (input.draftModeEnabled === false) {
      payload.draft_chat_enabled = false
    }

    const { data, error } = await ctx.supabase
      .from('games')
      .insert(payload)
      .select(publicGameFields)
      .maybeSingle()

    if (error || !data) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Unable to create game' })
    }

    return data
  }),

  update: protectedProcedure.input(updateGameInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    let resetCrunchNotice = false
    let shouldResetDraft = false
    if (input.crunchTimeStartTimeLocal !== undefined) {
      const { data: existing, error: existingError } = await ctx.supabase
        .from('games')
        .select('crunch_time_start_time_local')
        .eq('id', input.id)
        .maybeSingle()

      if (existingError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: existingError.message })
      }
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
      }

      const currentValue = existing.crunch_time_start_time_local ?? null
      const nextValue = input.crunchTimeStartTimeLocal ?? null
      resetCrunchNotice = currentValue !== nextValue
    }
    if (input.draftModeEnabled === false) {
      const { data: existing, error: existingError } = await ctx.supabase
        .from('games')
        .select('draft_mode_enabled')
        .eq('id', input.id)
        .maybeSingle()

      if (existingError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: existingError.message })
      }
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
      }
      shouldResetDraft = existing.draft_mode_enabled !== false
    }
    if (shouldResetDraft) {
      await resetDraftForGame({
        gameId: input.id,
        supabaseAdmin,
        actorId: ctx.user.id,
        preserveCaptains: false,
      })
    }

    if (input.audienceGroupId !== undefined) {
      const { data: existing, error: existingError } = await ctx.supabase
        .from('games')
        .select('community_id')
        .eq('id', input.id)
        .maybeSingle()

      if (existingError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: existingError.message })
      }
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
      }

      if (input.audienceGroupId) {
        await ensureGroupInCommunity({
          groupId: input.audienceGroupId,
          communityId: existing.community_id,
        })
      }
    }

    const payload: Database['public']['Tables']['games']['Update'] = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.description !== undefined) payload.description = input.description
    if (input.startTime !== undefined) payload.start_time = input.startTime
    if (input.endTime !== undefined) payload.end_time = input.endTime
    if (input.releaseAt !== undefined) payload.release_at = input.releaseAt
    if (input.audienceGroupId !== undefined) payload.audience_group_id = input.audienceGroupId
    if (input.locationName !== undefined) payload.location_name = input.locationName
    if (input.locationNotes !== undefined) payload.location_notes = input.locationNotes
    if (input.cost !== undefined) payload.cost_cents = Math.round(input.cost * 100)
    if (input.capacity !== undefined) payload.capacity = input.capacity
    if (input.status !== undefined) payload.status = input.status
    if (input.confirmationEnabled !== undefined) payload.confirmation_enabled = input.confirmationEnabled
    if (input.joinCutoffOffsetMinutesFromKickoff !== undefined) {
      payload.join_cutoff_offset_minutes_from_kickoff = input.joinCutoffOffsetMinutesFromKickoff
    }
    if (input.draftModeEnabled !== undefined) payload.draft_mode_enabled = input.draftModeEnabled
    if (input.draftVisibility !== undefined) payload.draft_visibility = input.draftVisibility
    if (input.draftChatEnabled !== undefined) payload.draft_chat_enabled = input.draftChatEnabled
    if (input.crunchTimeStartTimeLocal !== undefined) {
      payload.crunch_time_start_time_local = input.crunchTimeStartTimeLocal
    }
    if (resetCrunchNotice) {
      payload.crunch_time_notice_sent_at = null
    }
    if (input.draftModeEnabled === false) {
      payload.draft_chat_enabled = false
    }

    const { data, error } = await ctx.supabase
      .from('games')
      .update(payload)
      .eq('id', input.id)
      .select(publicGameFields)
      .maybeSingle()

    if (error || !data) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Unable to update game' })
    }

    if (input.status === 'cancelled') {
      await rollbackCommunityRatingForGame(supabaseAdmin, input.id)
    }

    if (input.capacity !== undefined) {
      const { data: reconcileData, error: reconcileError } = await ctx.supabase.rpc('reconcile_game_capacity', {
        p_game_id: input.id,
      })

      if (reconcileError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: reconcileError.message })
      }

      const promotedProfileIds = (reconcileData?.promoted_profile_ids ?? []) as string[]
      const demotedProfileIds = (reconcileData?.demoted_profile_ids ?? []) as string[]
      const promotedGuestQueueIds = (reconcileData?.promoted_guest_queue_ids ?? []) as string[]

      await Promise.all(
        promotedProfileIds.map((profileId) =>
          notifyWaitlistPromoted({ supabaseAdmin, gameId: input.id, profileId }).catch(() => {})
        )
      )
      await Promise.all(
        promotedGuestQueueIds.map((guestQueueId) =>
          notifyGuestNeedsConfirmation({
            supabaseAdmin,
            gameId: input.id,
            guestQueueId,
          }).catch(() => {})
        )
      )
      await Promise.all(
        demotedProfileIds.map((profileId) =>
          notifyWaitlistDemoted({ supabaseAdmin, gameId: input.id, profileId }).catch(() => {})
        )
      )

      if (promotedProfileIds.length || demotedProfileIds.length || promotedGuestQueueIds.length) {
        const { data: draftRow, error: draftError } = await supabaseAdmin
          .from('games')
          .select('draft_status')
          .eq('id', input.id)
          .maybeSingle()

        if (draftError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: draftError.message })
        }

        if (draftRow?.draft_status && draftRow.draft_status !== 'pending') {
          await resetDraftForGame({
            gameId: input.id,
            supabaseAdmin,
            actorId: ctx.user.id,
            preserveCaptains: false,
          })
        }
      }
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
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'Unable to cancel game',
        })
      }

      await rollbackCommunityRatingForGame(supabaseAdmin, data.id)

      try {
        await notifyGameCancelled({ supabaseAdmin, gameId: data.id })
      } catch {}

      return data
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ensureAdmin(ctx.supabase, ctx.user.id)

      await rollbackCommunityRatingForGame(supabaseAdmin, input.id)

      const { error } = await supabaseAdmin.from('games').delete().eq('id', input.id)
      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message ?? 'Unable to delete game',
        })
      }

      return { ok: true }
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
        .select('profile_id')
        .eq('game_id', input.gameId)
        .in('profile_id', captainIds)
        .eq('status', 'rostered')

      if (captainCheckError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: captainCheckError.message })
      }

      const rosteredCaptains = new Set(
        (captainRows ?? [])
          .map((row) => row.profile_id)
          .filter((profileId): profileId is string => Boolean(profileId))
      )
      if (rosteredCaptains.size !== captainIds.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Captains must be rostered before drafting' })
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

      const { error: readyError } = await supabaseAdmin
        .from('games')
        .update({ draft_status: 'ready', draft_style: null })
        .eq('id', input.gameId)
        .eq('draft_status', 'pending')

      if (readyError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: readyError.message })
      }

      const shouldNotifyDraft =
        snapshot.game.draft_mode_enabled &&
        snapshot.game.confirmation_enabled &&
        snapshot.game.draft_visibility !== 'admin_only'
      if (shouldNotifyDraft) {
        try {
          await notifyCaptainsAssigned({ supabaseAdmin, gameId: input.gameId, profileIds: captainIds })
        } catch {}
      }

      return { ok: true, draftStatus: 'ready' as const }
    }),

  setDraftStyle: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        draftStyle: draftStyleEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ensureAdmin(ctx.supabase, ctx.user.id)

      const { data: game, error: gameError } = await ctx.supabase
        .from('games')
        .select('id, draft_status, draft_mode_enabled, capacity')
        .eq('id', input.gameId)
        .maybeSingle()

      if (gameError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: gameError.message })
      }
      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
      }
      if (game.draft_mode_enabled === false) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Draft mode is off for this game' })
      }
      if (game.draft_status !== 'ready') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Draft mode can only be set after captains' })
      }
      if (input.draftStyle === 'auction') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Auction draft is not available yet' })
      }
      if (input.draftStyle === 'original') {
        if (game.capacity !== 12) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Original draft requires capacity of 12' })
        }
        const { data: captainRows, error: captainError } = await ctx.supabase
          .from('game_captains')
          .select('id')
          .eq('game_id', input.gameId)

        if (captainError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: captainError.message })
        }
        if ((captainRows ?? []).length !== 2) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Original draft requires exactly two captains' })
        }
      }

      const { error } = await ctx.supabase
        .from('games')
        .update({ draft_style: input.draftStyle })
        .eq('id', input.gameId)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { ok: true }
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

const isUserAdmin = async (supabase: SupabaseClient<Database>, userId: string) => {
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return data?.role === 'admin' || data?.role === 'owner'
}

const fetchRosteredProfileIds = async (
  supabase: SupabaseClient<Database>,
  gameId: string
) => {
  const { data, error } = await supabase
    .from('game_queue')
    .select('profile_id')
    .eq('game_id', gameId)
    .eq('status', 'rostered')
    .not('profile_id', 'is', null)

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }

  return (data ?? [])
    .map((row) => row.profile_id)
    .filter((profileId): profileId is string => Boolean(profileId))
}

const fetchUserGroupIds = async (
  supabase: SupabaseClient<Database>,
  profileId: string
) => {
  const { data, error } = await supabase
    .from('community_group_members')
    .select('group_id')
    .eq('profile_id', profileId)

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }

  return (data ?? []).map((row) => row.group_id)
}

const isProfileInGroup = async (
  supabase: SupabaseClient<Database>,
  groupId: string,
  profileId: string
) => {
  const { data, error } = await supabase
    .from('community_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }

  return Boolean(data)
}

const ensureGroupInCommunity = async ({
  groupId,
  communityId,
}: {
  groupId: string
  communityId: string
}) => {
  const { data, error } = await supabaseAdmin
    .from('community_groups')
    .select('id')
    .eq('id', groupId)
    .eq('community_id', communityId)
    .maybeSingle()

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }

  if (!data) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Group not found' })
  }
}
