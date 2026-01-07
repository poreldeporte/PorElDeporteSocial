import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { CONFIRMATION_WINDOW_MS } from '@my/config/game'
import type { Database } from '@my/supabase/types'
import { shuffleOrder } from '../domain/draft'

type DraftEventAction = 'pick' | 'undo' | 'reset' | 'start' | 'finalize'

type RecordDraftEventOptions = {
  gameId: string
  action: DraftEventAction
  supabaseAdmin: SupabaseClient<Database>
  teamId?: string | null
  profileId?: string | null
  createdBy?: string | null
  payload?: Record<string, unknown>
}

export const recordDraftEvent = async ({
  gameId,
  action,
  supabaseAdmin,
  teamId = null,
  profileId = null,
  createdBy = null,
  payload = {},
}: RecordDraftEventOptions) => {
  const { error } = await supabaseAdmin.from('game_draft_events').insert({
    game_id: gameId,
    team_id: teamId,
    profile_id: profileId,
    action,
    payload,
    created_by: createdBy,
  })

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }
}

type StartDraftOptions = {
  gameId: string
  teamNames?: string[]
  captainProfileIds: string[]
  supabaseAuthed: SupabaseClient<Database>
  supabaseAdmin: SupabaseClient<Database>
  actorId: string
}

export const startDraftForGame = async ({
  gameId,
  teamNames,
  captainProfileIds,
  supabaseAuthed,
  supabaseAdmin,
  actorId,
}: StartDraftOptions) => {
  const { data: game, error: gameError } = await supabaseAuthed
    .from('games')
    .select('id, draft_status')
    .eq('id', gameId)
    .maybeSingle()

  if (gameError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: gameError.message })
  }

  if (!game) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
  }

  if (game.draft_status && game.draft_status !== 'pending' && game.draft_status !== 'ready') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Draft already started' })
  }

  const { count: existingCount, error: existingError } = await supabaseAuthed
    .from('game_teams')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', gameId)

  if (existingError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: existingError.message })
  }

  if ((existingCount ?? 0) > 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Draft already initialized' })
  }

  if (captainProfileIds.length < 2) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'At least two captains required to start draft' })
  }

  const defaultTeamNames = captainProfileIds.map((_, index) => `Team ${index + 1}`)
  const resolvedTeamNames = teamNames?.length ? teamNames : defaultTeamNames
  if (resolvedTeamNames.length !== captainProfileIds.length) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Team names must match captain count' })
  }

  const shuffledCaptains = shuffleOrder(captainProfileIds)
  const teamSeeds = resolvedTeamNames.map((name, index) => ({
    name: name ?? defaultTeamNames[index] ?? `Team ${index + 1}`,
    captainProfileId: shuffledCaptains[index],
  }))

  const insertTeams = teamSeeds.map((team, index) => ({
    game_id: gameId,
    name: team.name,
    draft_order: index,
    captain_profile_id: team.captainProfileId,
  }))

  const { data: insertedTeams, error: insertError } = await supabaseAdmin
    .from('game_teams')
    .insert(insertTeams)
    .select('id, draft_order, captain_profile_id')
  if (insertError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message })
  }

  const captainAssignments =
    insertedTeams?.map((team) => ({
      game_id: gameId,
      game_team_id: team.id,
      profile_id: team.captain_profile_id,
      assigned_by: team.captain_profile_id,
      pick_order: 0,
    })) ?? []

  if (captainAssignments.length) {
    const { error: captainInsertError } = await supabaseAdmin.from('game_team_members').insert(captainAssignments)
    if (captainInsertError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: captainInsertError.message })
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('games')
    .update({ draft_status: 'in_progress', draft_turn: 0, draft_direction: 1 })
    .eq('id', gameId)

  if (updateError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
  }

  await recordDraftEvent({
    supabaseAdmin,
    gameId,
    action: 'start',
    createdBy: actorId,
    payload: { captainProfileIds },
  })
}

type ResetDraftOptions = {
  gameId: string
  supabaseAdmin: SupabaseClient<Database>
  actorId: string
  preserveCaptains?: boolean
}

export const resetDraftForGame = async ({
  gameId,
  supabaseAdmin,
  actorId,
  preserveCaptains = false,
}: ResetDraftOptions) => {
  const { data: game, error: gameError } = await supabaseAdmin
    .from('games')
    .select('id')
    .eq('id', gameId)
    .maybeSingle()

  if (gameError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: gameError.message })
  }

  if (!game) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
  }

  const { data: teamRows, error: teamFetchError } = await supabaseAdmin
    .from('game_teams')
    .select('id')
    .eq('game_id', gameId)

  if (teamFetchError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: teamFetchError.message })
  }

  const teamIds = (teamRows ?? []).map((team) => team.id)

  if (teamIds.length > 0) {
    const { error: membersError } = await supabaseAdmin
      .from('game_team_members')
      .delete()
      .in('game_team_id', teamIds)

    if (membersError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: membersError.message })
    }
  }

  const { error: deleteTeamsError } = await supabaseAdmin.from('game_teams').delete().eq('game_id', gameId)
  if (deleteTeamsError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteTeamsError.message })
  }

  const { error: resultsError } = await supabaseAdmin.from('game_results').delete().eq('game_id', gameId)
  if (resultsError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: resultsError.message })
  }

  if (!preserveCaptains) {
    const { error: captainsError } = await supabaseAdmin.from('game_captains').delete().eq('game_id', gameId)
    if (captainsError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: captainsError.message })
    }
  }

  const { error: eventsError } = await supabaseAdmin.from('game_draft_events').delete().eq('game_id', gameId)
  if (eventsError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: eventsError.message })
  }

  const { error: updateError } = await supabaseAdmin
    .from('games')
    .update({ draft_status: 'pending', draft_turn: null, draft_direction: 1 })
    .eq('id', gameId)

  if (updateError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
  }

  await recordDraftEvent({
    supabaseAdmin,
    gameId,
    action: 'reset',
    createdBy: actorId,
  })
}

type DraftStartSnapshot = {
  game: {
    id: string
    draft_status: Database['public']['Enums']['draft_status'] | null
    capacity: number | null
    start_time: string | null
  }
  confirmedCount: number
  attendanceConfirmedCount: number
}

export const fetchDraftStartSnapshot = async (
  supabase: SupabaseClient<Database>,
  gameId: string
): Promise<DraftStartSnapshot> => {
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, draft_status, capacity, start_time')
    .eq('id', gameId)
    .maybeSingle()

  if (gameError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: gameError.message })
  }
  if (!game) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
  }

  const [
    { count: confirmedCount, error: confirmedError },
    { count: attendanceConfirmedCount, error: attendanceError },
  ] = await Promise.all([
    supabase
      .from('game_queue')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', gameId)
      .eq('status', 'confirmed'),
    supabase
      .from('game_queue')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', gameId)
      .eq('status', 'confirmed')
      .not('attendance_confirmed_at', 'is', null),
  ])

  if (confirmedError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: confirmedError.message })
  }
  if (attendanceError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: attendanceError.message })
  }

  return {
    game,
    confirmedCount: confirmedCount ?? 0,
    attendanceConfirmedCount: attendanceConfirmedCount ?? 0,
  }
}

export const getDraftStartBlocker = ({
  snapshot,
  captainCount,
}: {
  snapshot: DraftStartSnapshot
  captainCount: number
}) => {
  const { game, confirmedCount, attendanceConfirmedCount } = snapshot
  if (game.draft_status && game.draft_status !== 'pending') {
    return 'Draft already started'
  }
  if (!game.capacity || confirmedCount !== game.capacity || attendanceConfirmedCount !== game.capacity) {
    return 'Full roster must be confirmed before assigning captains'
  }
  if (captainCount < 2) {
    return 'At least two captains required'
  }
  if (confirmedCount % captainCount !== 0) {
    return 'Captain count must divide evenly into the confirmed roster'
  }
  if (!game.start_time) {
    return 'Game start time required to draft'
  }

  const startTime = new Date(game.start_time)
  const confirmationWindowStart = new Date(startTime.getTime() - CONFIRMATION_WINDOW_MS)
  const now = new Date()
  if (now < confirmationWindowStart || now >= startTime) {
    return 'Draft is only available within the confirmation window'
  }

  return null
}
