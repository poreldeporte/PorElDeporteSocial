import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@my/supabase/types'

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
  teamNames: [string, string]
  captainProfileIds: [string, string]
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

  if (game.draft_status && game.draft_status !== 'pending') {
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

  if (!captainProfileIds[0] || !captainProfileIds[1]) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Two captains required to start draft' })
  }

  const insertTeams = teamNames.map((name, index) => ({
    game_id: gameId,
    name,
    draft_order: index,
    captain_profile_id: captainProfileIds[index],
  }))

  const { data: insertedTeams, error: insertError } = await supabaseAdmin
    .from('game_teams')
    .insert(insertTeams)
    .select('id, draft_order')
  if (insertError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message })
  }

  const captainAssignments =
    insertedTeams?.map((team) => ({
      game_team_id: team.id,
      profile_id: captainProfileIds[team.draft_order]!,
      assigned_by: captainProfileIds[team.draft_order]!,
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
}

export const resetDraftForGame = async ({ gameId, supabaseAdmin, actorId }: ResetDraftOptions) => {
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

  const { error: captainsError } = await supabaseAdmin.from('game_captains').delete().eq('game_id', gameId)
  if (captainsError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: captainsError.message })
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
