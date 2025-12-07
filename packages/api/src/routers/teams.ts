import { TRPCError } from '@trpc/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import type { Database } from '@my/supabase/types'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import { recordDraftEvent, resetDraftForGame, startDraftForGame } from '../services/draft'
import { ensureAdmin } from '../utils/ensureAdmin'
import { markGameCompletedIfNeeded } from '../utils/markGameCompleted'
import { nextSnakeTurn } from '../domain/draft'

const uuid = z.string().uuid()

const startDraftInput = z.object({
  gameId: uuid,
  teamNames: z.tuple([z.string().min(1), z.string().min(1)]).optional(),
})

const pickInput = z.object({
  gameId: uuid,
  teamId: uuid,
  profileId: uuid,
})

const finalizeInput = z.object({
  gameId: uuid,
})

const undoInput = z.object({
  gameId: uuid,
})

type DraftEventPayload = {
  pickOrder?: number
  draftTurnBefore?: number
  draftDirectionBefore?: number
  undone?: boolean
  [key: string]: unknown
}

const reportResultInput = z.object({
  gameId: uuid,
  winningTeamId: uuid,
  losingTeamId: uuid.optional(),
  winnerScore: z.number().int().nonnegative().nullable().optional(),
  loserScore: z.number().int().nonnegative().nullable().optional(),
})

const confirmResultInput = z.object({
  gameId: uuid,
})

export const teamsRouter = createTRPCRouter({
  state: protectedProcedure.input(z.object({ gameId: uuid })).query(async ({ ctx, input }) => {
    const { supabase, user } = ctx

    const [
      { data: game, error: gameError },
      { data: teams, error: teamsError },
      { data: captains, error: captainsError },
      { data: events, error: eventsError },
    ] = await Promise.all([
      supabase
        .from('games')
        .select('id, draft_status, draft_turn, draft_direction')
        .eq('id', input.gameId)
        .maybeSingle(),
        supabase
          .from('game_teams')
          .select(
          `
          id,
          name,
          draft_order,
          captain_profile_id,
          game_team_members (
            id,
            profile_id,
            pick_order,
            assigned_at,
            profiles!game_team_members_profile_id_fkey (
              id,
              name,
              avatar_url,
              jersey_number
              )
            )
          `
          )
          .eq('game_id', input.gameId)
          .order('draft_order', { ascending: true }),
        supabase.from('game_captains').select('slot, profile_id').eq('game_id', input.gameId),
        supabase
          .from('game_draft_events')
          .select('id, game_id, team_id, profile_id, action, payload, created_by, created_at')
          .eq('game_id', input.gameId)
          .order('created_at', { ascending: true }),
      ])

    if (gameError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: gameError.message })
    if (teamsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: teamsError.message })
    if (captainsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: captainsError.message })
    if (eventsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: eventsError.message })
    if (!game) throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })

    const normalizedGame = game
      ? {
          id: game.id,
          draft_status: game.draft_status,
          draft_turn: game.draft_turn,
          draft_direction: game.draft_direction,
        }
      : null

    const teamList = teams ?? []
    const captainRecords = (captains ?? []).map((captain) => ({
      slot: captain.slot ?? null,
      profile_id: captain.profile_id ?? null,
    }))
    const captainSlot = captainRecords.find((captain) => captain.profile_id === user.id)?.slot ?? null

    const captainTeamIdFromTeams =
      teamList.find((team) => team.captain_profile_id === user.id)?.id ?? null

    const fallbackTeamId =
      captainSlot != null
        ? teamList.find((team) => Number(team.draft_order) === captainSlot - 1)?.id ?? null
        : null

    const currentTurnTeam =
      typeof game?.draft_turn === 'number'
        ? teamList.find((team) => Number(team.draft_order) === game.draft_turn) ?? null
        : null

    const userCaptainTeamId = captainTeamIdFromTeams ?? fallbackTeamId ?? null
    const isCaptainTurn = Boolean(currentTurnTeam && userCaptainTeamId && currentTurnTeam.id === userCaptainTeamId)

    return {
      game: normalizedGame,
      teams: teamList,
      captainTeamId: userCaptainTeamId,
      currentTurnTeamId: currentTurnTeam?.id ?? null,
      isCaptainTurn,
      events: events ?? [],
    }
  }),

  startDraft: protectedProcedure.input(startDraftInput).mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx
    await ensureAdmin(supabase, user.id)

    const existing = await supabase.from('game_teams').select('id').eq('game_id', input.gameId)
    if (existing.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: existing.error.message })
    if ((existing.data?.length ?? 0) > 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Draft already initialized' })
    }

    const { data: captains, error: captainsError } = await supabase
      .from('game_captains')
      .select('profile_id')
      .eq('game_id', input.gameId)
      .order('slot', { ascending: true })

    if (captainsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: captainsError.message })
    if ((captains?.length ?? 0) < 2) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Assign two captains before starting the draft' })
    }

    const teamNames = input.teamNames ?? ['Team A', 'Team B']

    await startDraftForGame({
      gameId: input.gameId,
      teamNames,
      captainProfileIds: [captains[0]!.profile_id, captains[1]!.profile_id],
      supabaseAuthed: supabase,
      supabaseAdmin,
      actorId: user.id,
    })

    return { ok: true }
  }),

  resetDraft: protectedProcedure.input(z.object({ gameId: uuid })).mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx
    await ensureAdmin(supabase, user.id)

    await resetDraftForGame({
      gameId: input.gameId,
      supabaseAdmin,
      actorId: user.id,
    })

    return { ok: true }
  }),

  pickPlayer: protectedProcedure.input(pickInput).mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx

    const game = await fetchGame(supabase, input.gameId)
    if (!game) throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
    if (game.draft_status !== 'in_progress') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Draft is not in progress' })
    }

    const teams = await fetchTeams(supabase, input.gameId)
    const team = teams.find((t) => t.id === input.teamId)
    if (!team) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid team' })

    const isAdmin = await isUserAdmin(supabase, user.id)
    const isCaptain = await isUserCaptain(supabase, input.gameId, user.id)

    if (!isAdmin && !isCaptain) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only captains can make picks' })
    }

    if (!isAdmin && team.captain_profile_id && team.captain_profile_id !== user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not assigned to this team' })
    }

    const currentTurn = game.draft_turn ?? 0
    if (!isAdmin && Number(team.draft_order) !== currentTurn) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not your turn' })
    }

    const rosterEntry = await fetchRosterEntry(supabase, input.gameId, input.profileId)
    if (!rosterEntry) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Player is not on this roster' })
    }
    if (rosterEntry.status !== 'confirmed') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Player is not confirmed' })
    }

    const alreadyDrafted = await isPlayerDrafted(supabase, teams.map((t) => t.id), input.profileId)
    if (alreadyDrafted) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Player already drafted' })
    }

    const pickOrder = await nextPickOrder(input.gameId)

    const { error: insertError } = await supabaseAdmin.from('game_team_members').insert({
      game_team_id: input.teamId,
      profile_id: input.profileId,
      assigned_by: user.id,
      pick_order: pickOrder,
    })

    if (insertError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message })
    }

    const { nextTurn, nextDirection } = nextSnakeTurn(currentTurn, game.draft_direction ?? 1, teams.length)

    await supabaseAdmin
      .from('games')
      .update({ draft_turn: nextTurn, draft_direction: nextDirection })
      .eq('id', input.gameId)

    await recordDraftEvent({
      supabaseAdmin,
      gameId: input.gameId,
      action: 'pick',
      teamId: input.teamId,
      profileId: input.profileId,
      createdBy: user.id,
      payload: {
        pickOrder,
        draftTurnBefore: currentTurn,
        draftDirectionBefore: game.draft_direction ?? 1,
      },
    })

    return { ok: true }
  }),

  finalizeDraft: protectedProcedure.input(finalizeInput).mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx
    await ensureAdmin(supabase, user.id)

    const teams = await fetchTeams(supabase, input.gameId)

    const [confirmedCount, draftedCount] = await Promise.all([
      countConfirmedPlayers(supabase, input.gameId),
      countDraftedPlayers(supabase, teams.map((t) => t.id)),
    ])

    if (confirmedCount === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No confirmed players' })
    }
    if (draftedCount !== confirmedCount) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'All players must be drafted before finalizing' })
    }

    const draftedIds = new Set(
      teams.flatMap((team) => team.game_team_members?.map((member) => member.profile_id) ?? [])
    )
    const { data: rosterEntries, error: rosterError } = await supabase
      .from('game_queue')
      .select('profile_id')
      .eq('game_id', input.gameId)
      .eq('status', 'confirmed')
    if (rosterError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: rosterError.message })
    }
    if ((rosterEntries ?? []).some((entry) => !draftedIds.has(entry.profile_id))) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Every confirmed player must be assigned to a team before finalizing',
      })
    }

    const { error } = await supabaseAdmin
      .from('games')
      .update({ draft_status: 'completed', draft_turn: null })
      .eq('id', input.gameId)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    await recordDraftEvent({
      supabaseAdmin,
      gameId: input.gameId,
      action: 'finalize',
      createdBy: user.id,
    })

    return { ok: true }
  }),

  reportResult: protectedProcedure.input(reportResultInput).mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx

    const teams = await fetchTeams(supabase, input.gameId)
    if (!teams.find((team) => team.id === input.winningTeamId)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Winning team not part of this game' })
    }
    if (input.losingTeamId && !teams.find((team) => team.id === input.losingTeamId)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Losing team not part of this game' })
    }

    const isAdmin = await isUserAdmin(supabase, user.id)
    const isCaptain = await isUserCaptain(supabase, input.gameId, user.id)
    if (!isAdmin && !isCaptain) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only captains can report results' })
    }

    const losingTeamIdResolved =
      input.losingTeamId ?? teams.find((t) => t.id !== input.winningTeamId)?.id ?? null

    const payload = {
      game_id: input.gameId,
      winning_team_id: input.winningTeamId,
      losing_team_id: losingTeamIdResolved,
      winner_score: input.winnerScore ?? null,
      loser_score: input.loserScore ?? null,
      reported_by: user.id,
      reported_at: new Date().toISOString(),
      status: isAdmin ? 'confirmed' : 'pending',
    }

    const { error } = await supabaseAdmin.from('game_results').upsert(payload, { onConflict: 'game_id' })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    if (payload.status === 'confirmed' && payload.losing_team_id) {
      await recordPlayerStats(payload.game_id, payload.winning_team_id, payload.losing_team_id)
    }
    await markGameCompletedIfNeeded(supabaseAdmin, input.gameId, payload.status === 'confirmed')

    return { ok: true, status: payload.status }
  }),

  confirmResult: protectedProcedure.input(confirmResultInput).mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx
    const isAdmin = await isUserAdmin(supabase, user.id)
    const isCaptain = await isUserCaptain(supabase, input.gameId, user.id)
    if (!isAdmin && !isCaptain) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only captains can confirm results' })
    }

    const { error } = await supabaseAdmin
      .from('game_results')
      .update({ status: 'confirmed' })
      .eq('game_id', input.gameId)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    const { data: resultRow, error: resultFetchError } = await supabaseAdmin
      .from('game_results')
      .select('winning_team_id, losing_team_id')
      .eq('game_id', input.gameId)
      .maybeSingle()

    if (resultFetchError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: resultFetchError.message })
    }

    if (resultRow?.winning_team_id && resultRow?.losing_team_id) {
      await recordPlayerStats(input.gameId, resultRow.winning_team_id, resultRow.losing_team_id)
    }
    await markGameCompletedIfNeeded(supabaseAdmin, input.gameId, true)

    return { ok: true }
  }),

  undoPick: protectedProcedure.input(undoInput).mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx
    await ensureAdmin(supabase, user.id)

    const { data: events, error: eventsError } = await supabaseAdmin
      .from('game_draft_events')
      .select('id, team_id, profile_id, payload, created_at')
      .eq('game_id', input.gameId)
      .eq('action', 'pick')
      .order('created_at', { ascending: false })
      .limit(20)

    if (eventsError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: eventsError.message })
    }

    const targetEvent = (events ?? []).find((event) => {
      const payload = (event.payload as DraftEventPayload | null) ?? {}
      return !payload.undone
    })

    if (!targetEvent || !targetEvent.team_id || !targetEvent.profile_id) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No picks available to undo' })
    }

    const payload = (targetEvent.payload as DraftEventPayload | null) ?? {}
    const previousTurn = Number(payload.draftTurnBefore ?? 0)
    const previousDirection = Number(payload.draftDirectionBefore ?? 1)
    const pickOrder = payload.pickOrder ?? null

    const { error: deleteError } = await supabaseAdmin
      .from('game_team_members')
      .delete()
      .eq('game_team_id', targetEvent.team_id)
      .eq('profile_id', targetEvent.profile_id)

    if (deleteError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteError.message })
    }

    const updatedPayload = {
      ...payload,
      undone: true,
      undoneBy: user.id,
      undoneAt: new Date().toISOString(),
    }

    const { error: markUndoneError } = await supabaseAdmin
      .from('game_draft_events')
      .update({ payload: updatedPayload })
      .eq('id', targetEvent.id)

    if (markUndoneError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: markUndoneError.message })
    }

    const { error: turnUpdateError } = await supabaseAdmin
      .from('games')
      .update({ draft_turn: previousTurn, draft_direction: previousDirection })
      .eq('id', input.gameId)

    if (turnUpdateError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: turnUpdateError.message })
    }

    await recordDraftEvent({
      supabaseAdmin,
      gameId: input.gameId,
      action: 'undo',
      teamId: targetEvent.team_id,
      profileId: targetEvent.profile_id,
      createdBy: user.id,
      payload: {
        reversedEventId: targetEvent.id,
        pickOrder,
      },
    })

    return { ok: true }
  }),
})

const fetchGame = async (supabase: SupabaseClient<Database>, gameId: string) => {
  const { data, error } = await supabase
    .from('games')
    .select('id, draft_status, draft_turn, draft_direction')
    .eq('id', gameId)
    .maybeSingle()
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return data
}

const fetchTeams = async (supabase: SupabaseClient<Database>, gameId: string) => {
  const { data, error } = await supabase
    .from('game_teams')
    .select(
      `id,
       name,
       draft_order,
       captain_profile_id,
       game_team_members ( profile_id )`
    )
    .eq('game_id', gameId)
    .order('draft_order', { ascending: true })
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return data ?? []
}

const fetchRosterEntry = async (supabase: SupabaseClient<Database>, gameId: string, profileId: string) => {
  const { data, error } = await supabase
    .from('game_queue')
    .select('status')
    .eq('game_id', gameId)
    .eq('profile_id', profileId)
    .maybeSingle()
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return data
}

const isPlayerDrafted = async (
  supabase: SupabaseClient<Database>,
  teamIds: string[],
  profileId: string
): Promise<boolean> => {
  if (teamIds.length === 0) return false
  const { data, error } = await supabase
    .from('game_team_members')
    .select('id')
    .eq('profile_id', profileId)
    .in('game_team_id', teamIds)
    .limit(1)
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return Boolean(data && data.length > 0)
}

const isUserAdmin = async (supabase: SupabaseClient<Database>, userId: string) => {
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return data?.role === 'admin'
}

const isUserCaptain = async (supabase: SupabaseClient<Database>, gameId: string, userId: string) => {
  const { data, error } = await supabase
    .from('game_captains')
    .select('profile_id')
    .eq('game_id', gameId)
    .eq('profile_id', userId)
    .maybeSingle()
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return Boolean(data)
}

const countConfirmedPlayers = async (supabase: SupabaseClient<Database>, gameId: string) => {
  const { count, error } = await supabase
    .from('game_queue')
    .select('id', { head: true, count: 'exact' })
    .eq('game_id', gameId)
    .eq('status', 'confirmed')
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return count ?? 0
}

const countDraftedPlayers = async (supabase: SupabaseClient<Database>, teamIds: string[]) => {
  if (teamIds.length === 0) return 0
  const { count, error } = await supabase
    .from('game_team_members')
    .select('id', { count: 'exact', head: true })
    .in('game_team_id', teamIds)
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return count ?? 0
}

const nextPickOrder = async (gameId: string) => {
  const { data: teamRows, error: teamError } = await supabaseAdmin
    .from('game_teams')
    .select('id')
    .eq('game_id', gameId)

  if (teamError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: teamError.message })

  const teamIds = (teamRows ?? []).map((row) => row.id)
  if (teamIds.length === 0) return 1

  const { data, error } = await supabaseAdmin
    .from('game_team_members')
    .select('pick_order')
    .in('game_team_id', teamIds)
    .order('pick_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return (data?.pick_order ?? 0) + 1
}

const recordPlayerStats = async (gameId: string, winningTeamId: string, losingTeamId: string) => {
  const teamIds = [winningTeamId, losingTeamId].filter(Boolean)
  if (teamIds.length === 0) return

  const { data: members, error } = await supabaseAdmin
    .from('game_team_members')
    .select('game_team_id, profile_id, pick_order')
    .in('game_team_id', teamIds)

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

  const payload =
    members?.map((member) => ({
      game_id: gameId,
      team_id: member.game_team_id,
      profile_id: member.profile_id,
      result: member.game_team_id === winningTeamId ? 'win' : 'loss',
      pick_order: member.pick_order ?? null,
    })) ?? []

  if (!payload.length) return

  const { error: statsError } = await supabaseAdmin
    .from('game_player_stats')
    .upsert(payload, { onConflict: 'game_id,profile_id' })

  if (statsError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: statsError.message })
  }
}
