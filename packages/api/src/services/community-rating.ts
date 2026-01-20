import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@my/supabase/types'
import { computeCommunityRatingDeltas } from '../domain/communityRating'

type TeamRow = {
  id: string
  draft_order: number | null
}

type MemberRow = {
  game_team_id: string | null
  profile_id: string | null
}

type ResultRow = {
  winning_team_id: string | null
  losing_team_id: string | null
  winner_score: number | null
  loser_score: number | null
  status: string | null
}

type GameRow = {
  id: string
  community_id: string
  status: string
  draft_status: string | null
  draft_mode_enabled: boolean | null
}

type RatingRow = {
  id: string
  game_id: string
  community_id: string
  rated: boolean
  applied_at: string
}

type RatingPlayerRow = {
  profile_id: string
  team_id: string
  team_side: 'A' | 'B'
  pre_rating: number
  pre_rated_games: number
  k_used: number
  delta: number
}

type PlayerRating = {
  rating: number
  ratedGames: number
}

type RatingContext = {
  communityId: string
  shouldRate: boolean
  goalDiff?: number
  teamAId?: string
  teamBId?: string
  teamAProfileIds?: string[]
  teamBProfileIds?: string[]
}

type RatingChange = {
  profileId: string
  ratingDelta: number
  ratedGamesDelta: number
}

type RatingEventType = 'apply' | 'adjust' | 'rollback'

const DEFAULT_RATING = 1500

const buildRatingError = (message: string) =>
  new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message })

const fetchRatingContext = async (
  supabaseAdmin: SupabaseClient<Database>,
  gameId: string
): Promise<RatingContext | null> => {
  const { data: game, error: gameError } = await supabaseAdmin
    .from('games')
    .select('id, community_id, status, draft_status, draft_mode_enabled')
    .eq('id', gameId)
    .maybeSingle()

  if (gameError) throw buildRatingError(gameError.message)
  if (!game) return null

  const row = game as GameRow
  const communityId = row.community_id

  if (row.status === 'cancelled') {
    return { communityId, shouldRate: false }
  }

  if (row.draft_mode_enabled === false) {
    return { communityId, shouldRate: false }
  }

  if (row.draft_status !== 'completed') {
    return { communityId, shouldRate: false }
  }

  const { data: teams, error: teamsError } = await supabaseAdmin
    .from('game_teams')
    .select('id, draft_order')
    .eq('game_id', gameId)

  if (teamsError) throw buildRatingError(teamsError.message)

  const sortedTeams = (teams as TeamRow[] | null)?.slice() ?? []
  sortedTeams.sort((a, b) => {
    const orderA = a.draft_order ?? 0
    const orderB = b.draft_order ?? 0
    if (orderA !== orderB) return orderA - orderB
    return a.id.localeCompare(b.id)
  })

  if (sortedTeams.length !== 2) {
    return { communityId, shouldRate: false }
  }

  const teamA = sortedTeams[0]
  const teamB = sortedTeams[1]

  const { data: members, error: membersError } = await supabaseAdmin
    .from('game_team_members')
    .select('game_team_id, profile_id')
    .eq('game_id', gameId)

  if (membersError) throw buildRatingError(membersError.message)

  const teamAProfileIds = (members as MemberRow[] | null)?.filter((member) => {
    if (!member.profile_id) return false
    return member.game_team_id === teamA.id
  }).map((member) => member.profile_id as string) ?? []

  const teamBProfileIds = (members as MemberRow[] | null)?.filter((member) => {
    if (!member.profile_id) return false
    return member.game_team_id === teamB.id
  }).map((member) => member.profile_id as string) ?? []

  if (!teamAProfileIds.length || !teamBProfileIds.length) {
    return { communityId, shouldRate: false }
  }

  const { data: result, error: resultError } = await supabaseAdmin
    .from('game_results')
    .select('winning_team_id, losing_team_id, winner_score, loser_score, status')
    .eq('game_id', gameId)
    .maybeSingle()

  if (resultError) throw buildRatingError(resultError.message)

  const resultRow = result as ResultRow | null
  if (!resultRow || resultRow.status !== 'confirmed') {
    return { communityId, shouldRate: false }
  }

  if (
    resultRow.winning_team_id == null ||
    resultRow.losing_team_id == null ||
    resultRow.winner_score == null ||
    resultRow.loser_score == null
  ) {
    return { communityId, shouldRate: false }
  }

  const scoreForTeam = (teamId: string) => {
    if (teamId === resultRow.winning_team_id) return resultRow.winner_score
    if (teamId === resultRow.losing_team_id) return resultRow.loser_score
    return null
  }

  const teamAScore = scoreForTeam(teamA.id)
  const teamBScore = scoreForTeam(teamB.id)

  if (teamAScore == null || teamBScore == null) {
    return { communityId, shouldRate: false }
  }

  const { data: noShowRows, error: noShowError } = await supabaseAdmin
    .from('game_queue')
    .select('id')
    .eq('game_id', gameId)
    .eq('status', 'rostered')
    .not('no_show_at', 'is', null)
    .limit(1)

  if (noShowError) throw buildRatingError(noShowError.message)

  if ((noShowRows ?? []).length > 0) {
    return { communityId, shouldRate: false }
  }

  return {
    communityId,
    shouldRate: true,
    goalDiff: teamAScore - teamBScore,
    teamAId: teamA.id,
    teamBId: teamB.id,
    teamAProfileIds,
    teamBProfileIds,
  }
}

const fetchRatingSnapshot = async (supabaseAdmin: SupabaseClient<Database>, gameId: string) => {
  const { data: ratingRow, error: ratingError } = await supabaseAdmin
    .from('community_game_ratings')
    .select('id, game_id, community_id, rated, applied_at')
    .eq('game_id', gameId)
    .maybeSingle()

  if (ratingError) throw buildRatingError(ratingError.message)

  const row = ratingRow as RatingRow | null

  if (!row) {
    return { ratingRow: null, playerRows: [] as RatingPlayerRow[] }
  }

  const { data: playerRows, error: playerError } = await supabaseAdmin
    .from('community_game_rating_players')
    .select('profile_id, team_id, team_side, pre_rating, pre_rated_games, k_used, delta')
    .eq('game_id', gameId)

  if (playerError) throw buildRatingError(playerError.message)

  return {
    ratingRow: row,
    playerRows: (playerRows as RatingPlayerRow[] | null) ?? [],
  }
}

const fetchCurrentRatings = async (
  supabaseAdmin: SupabaseClient<Database>,
  communityId: string,
  profileIds: string[]
) => {
  const map = new Map<string, PlayerRating>()
  profileIds.forEach((profileId) => {
    map.set(profileId, { rating: DEFAULT_RATING, ratedGames: 0 })
  })
  if (!profileIds.length) return map

  const { data, error } = await supabaseAdmin
    .from('community_ratings')
    .select('profile_id, rating, rated_games')
    .eq('community_id', communityId)
    .in('profile_id', profileIds)

  if (error) throw buildRatingError(error.message)

  ;(data ?? []).forEach((row) => {
    map.set(row.profile_id as string, {
      rating: typeof row.rating === 'number' ? row.rating : DEFAULT_RATING,
      ratedGames: typeof row.rated_games === 'number' ? row.rated_games : 0,
    })
  })

  return map
}

const fetchRatingsAt = async (
  supabaseAdmin: SupabaseClient<Database>,
  communityId: string,
  profileIds: string[],
  asOf: string
) => {
  const current = await fetchCurrentRatings(supabaseAdmin, communityId, profileIds)

  if (!profileIds.length) return current

  const { data: events, error: eventsError } = await supabaseAdmin
    .from('community_rating_events')
    .select('profile_id, delta, rated_games_delta, created_at')
    .eq('community_id', communityId)
    .in('profile_id', profileIds)
    .gte('created_at', asOf)

  if (eventsError) throw buildRatingError(eventsError.message)

  const sums = new Map<string, { delta: number; ratedGames: number }>()

  ;(events ?? []).forEach((row) => {
    const profileId = row.profile_id as string
    const currentSum = sums.get(profileId) ?? { delta: 0, ratedGames: 0 }
    currentSum.delta += typeof row.delta === 'number' ? row.delta : 0
    currentSum.ratedGames += typeof row.rated_games_delta === 'number' ? row.rated_games_delta : 0
    sums.set(profileId, currentSum)
  })

  const snapshot = new Map<string, PlayerRating>()
  profileIds.forEach((profileId) => {
    const base = current.get(profileId) ?? { rating: DEFAULT_RATING, ratedGames: 0 }
    const adjust = sums.get(profileId) ?? { delta: 0, ratedGames: 0 }
    snapshot.set(profileId, {
      rating: base.rating - adjust.delta,
      ratedGames: Math.max(0, base.ratedGames - adjust.ratedGames),
    })
  })

  return snapshot
}

const applyRatingChanges = async (
  supabaseAdmin: SupabaseClient<Database>,
  communityId: string,
  gameId: string,
  changes: RatingChange[],
  eventType: RatingEventType
) => {
  const meaningful = changes.filter(
    (change) => change.ratingDelta !== 0 || change.ratedGamesDelta !== 0
  )
  if (!meaningful.length) return

  const profileIds = meaningful.map((change) => change.profileId)
  const current = await fetchCurrentRatings(supabaseAdmin, communityId, profileIds)

  const updates = meaningful.map((change) => {
    const base = current.get(change.profileId) ?? { rating: DEFAULT_RATING, ratedGames: 0 }
    return {
      community_id: communityId,
      profile_id: change.profileId,
      rating: Math.max(0, base.rating + change.ratingDelta),
      rated_games: Math.max(0, base.ratedGames + change.ratedGamesDelta),
    }
  })

  const { error: updateError } = await supabaseAdmin
    .from('community_ratings')
    .upsert(updates, { onConflict: 'community_id,profile_id' })

  if (updateError) throw buildRatingError(updateError.message)

  const events = meaningful.map((change) => ({
    community_id: communityId,
    game_id: gameId,
    profile_id: change.profileId,
    delta: change.ratingDelta,
    rated_games_delta: change.ratedGamesDelta,
    event_type: eventType,
  }))

  const { error: eventError } = await supabaseAdmin
    .from('community_rating_events')
    .insert(events)

  if (eventError) throw buildRatingError(eventError.message)
}

const buildRatingChanges = (
  newPlayers: Map<string, { delta: number }>,
  oldPlayers: Map<string, { delta: number }>,
  wasRated: boolean
) => {
  const changes: RatingChange[] = []
  const newIds = new Set(newPlayers.keys())
  const oldIds = new Set(oldPlayers.keys())
  const unionIds = new Set([...newIds, ...oldIds])

  unionIds.forEach((profileId) => {
    const oldDelta = wasRated ? (oldPlayers.get(profileId)?.delta ?? 0) : 0
    const newDelta = newPlayers.get(profileId)?.delta ?? 0
    const ratingDelta = newDelta - oldDelta
    let ratedGamesDelta = 0

    if (wasRated) {
      ratedGamesDelta = (newIds.has(profileId) ? 1 : 0) - (oldIds.has(profileId) ? 1 : 0)
    } else {
      ratedGamesDelta = newIds.has(profileId) ? 1 : 0
    }

    if (ratingDelta !== 0 || ratedGamesDelta !== 0) {
      changes.push({ profileId, ratingDelta, ratedGamesDelta })
    }
  })

  return changes
}

const storeRatingSnapshot = async (
  supabaseAdmin: SupabaseClient<Database>,
  ratingRow: RatingRow | null,
  data: {
    gameId: string
    communityId: string
    teamAId: string
    teamBId: string
    goalDiff: number
    teamARating: number
    teamBRating: number
    rated: boolean
  }
) => {
  if (!ratingRow) {
    const { data: inserted, error } = await supabaseAdmin
      .from('community_game_ratings')
      .insert({
        game_id: data.gameId,
        community_id: data.communityId,
        rated: data.rated,
        team_a_id: data.teamAId,
        team_b_id: data.teamBId,
        goal_diff: data.goalDiff,
        team_a_rating: data.teamARating,
        team_b_rating: data.teamBRating,
        invalidated_at: data.rated ? null : new Date().toISOString(),
      })
      .select('id, game_id, community_id, rated, applied_at')
      .maybeSingle()

    if (error) throw buildRatingError(error.message)
    if (!inserted) throw buildRatingError('Unable to store rating snapshot')
    return inserted as RatingRow
  }

  const { error } = await supabaseAdmin
    .from('community_game_ratings')
    .update({
      rated: data.rated,
      team_a_id: data.teamAId,
      team_b_id: data.teamBId,
      goal_diff: data.goalDiff,
      team_a_rating: data.teamARating,
      team_b_rating: data.teamBRating,
      invalidated_at: data.rated ? null : new Date().toISOString(),
    })
    .eq('id', ratingRow.id)

  if (error) throw buildRatingError(error.message)

  return ratingRow
}

const upsertRatingPlayers = async (
  supabaseAdmin: SupabaseClient<Database>,
  gameRatingId: string,
  communityId: string,
  gameId: string,
  players: Array<{
    profileId: string
    teamId: string
    teamSide: 'A' | 'B'
    preRating: number
    preRatedGames: number
    kUsed: number
    delta: number
  }>
) => {
  if (!players.length) return

  const payload = players.map((player) => ({
    game_rating_id: gameRatingId,
    community_id: communityId,
    game_id: gameId,
    profile_id: player.profileId,
    team_id: player.teamId,
    team_side: player.teamSide,
    pre_rating: player.preRating,
    pre_rated_games: player.preRatedGames,
    k_used: player.kUsed,
    delta: player.delta,
  }))

  const { error } = await supabaseAdmin
    .from('community_game_rating_players')
    .upsert(payload, { onConflict: 'game_id,profile_id' })

  if (error) throw buildRatingError(error.message)
}

const pruneRatingPlayers = async (
  supabaseAdmin: SupabaseClient<Database>,
  gameId: string,
  profileIds: string[]
) => {
  if (!profileIds.length) return

  const { error } = await supabaseAdmin
    .from('community_game_rating_players')
    .delete()
    .eq('game_id', gameId)
    .in('profile_id', profileIds)

  if (error) throw buildRatingError(error.message)
}

const resetRatingPlayerDeltas = async (supabaseAdmin: SupabaseClient<Database>, gameId: string) => {
  const { error } = await supabaseAdmin
    .from('community_game_rating_players')
    .update({ delta: 0 })
    .eq('game_id', gameId)

  if (error) throw buildRatingError(error.message)
}

const rollbackFromSnapshot = async (
  supabaseAdmin: SupabaseClient<Database>,
  ratingRow: RatingRow,
  playerRows: RatingPlayerRow[]
) => {
  if (!ratingRow.rated) return

  const changes = playerRows.map((player) => ({
    profileId: player.profile_id,
    ratingDelta: -player.delta,
    ratedGamesDelta: -1,
  }))

  await applyRatingChanges(
    supabaseAdmin,
    ratingRow.community_id,
    ratingRow.game_id,
    changes,
    'rollback'
  )

  await supabaseAdmin
    .from('community_game_ratings')
    .update({ rated: false, invalidated_at: new Date().toISOString() })
    .eq('id', ratingRow.id)

  await resetRatingPlayerDeltas(supabaseAdmin, ratingRow.game_id)
}

export const rollbackCommunityRatingForGame = async (
  supabaseAdmin: SupabaseClient<Database>,
  gameId: string
) => {
  const { ratingRow, playerRows } = await fetchRatingSnapshot(supabaseAdmin, gameId)
  if (!ratingRow || !ratingRow.rated) return

  await rollbackFromSnapshot(supabaseAdmin, ratingRow, playerRows)
}

export const reconcileCommunityRatingForGame = async (
  supabaseAdmin: SupabaseClient<Database>,
  gameId: string
) => {
  const context = await fetchRatingContext(supabaseAdmin, gameId)
  if (!context) return

  const { ratingRow, playerRows } = await fetchRatingSnapshot(supabaseAdmin, gameId)
  const communityId = ratingRow?.community_id ?? context.communityId

  if (!context.shouldRate) {
    if (ratingRow?.rated) {
      await rollbackFromSnapshot(supabaseAdmin, ratingRow, playerRows)
    }
    return
  }

  const teamAProfileIds = context.teamAProfileIds ?? []
  const teamBProfileIds = context.teamBProfileIds ?? []
  const rosterProfileIds = [...teamAProfileIds, ...teamBProfileIds]

  if (!rosterProfileIds.length || !context.teamAId || !context.teamBId || context.goalDiff == null) {
    return
  }

  const wasRated = ratingRow?.rated ?? false
  const previousPlayers = new Map(
    playerRows.map((player) => [player.profile_id, { ...player }])
  )
  const missingProfileIds = rosterProfileIds.filter((id) => !previousPlayers.has(id))

  let historicalRatings = new Map<string, PlayerRating>()
  if (ratingRow && missingProfileIds.length) {
    historicalRatings = await fetchRatingsAt(
      supabaseAdmin,
      ratingRow.community_id,
      missingProfileIds,
      ratingRow.applied_at
    )
  }

  if (!ratingRow && rosterProfileIds.length) {
    const currentRatings = await fetchCurrentRatings(
      supabaseAdmin,
      context.communityId,
      rosterProfileIds
    )
    rosterProfileIds.forEach((profileId) => {
      if (!historicalRatings.has(profileId)) {
        historicalRatings.set(profileId, currentRatings.get(profileId) ?? { rating: DEFAULT_RATING, ratedGames: 0 })
      }
    })
  }

  const resolvePreRating = (profileId: string): PlayerRating => {
    const existing = previousPlayers.get(profileId)
    if (existing) {
      return {
        rating: existing.pre_rating,
        ratedGames: existing.pre_rated_games,
      }
    }
    return historicalRatings.get(profileId) ?? { rating: DEFAULT_RATING, ratedGames: 0 }
  }

  const teamAInputs = teamAProfileIds.map((profileId) => {
    const rating = resolvePreRating(profileId)
    return {
      profileId,
      preRating: rating.rating,
      preRatedGames: rating.ratedGames,
    }
  })

  const teamBInputs = teamBProfileIds.map((profileId) => {
    const rating = resolvePreRating(profileId)
    return {
      profileId,
      preRating: rating.rating,
      preRatedGames: rating.ratedGames,
    }
  })

  const { teamARating, teamBRating, playerDeltas } = computeCommunityRatingDeltas({
    teamA: teamAInputs,
    teamB: teamBInputs,
    goalDiff: context.goalDiff,
  })

  const nextPlayers = new Map(
    playerDeltas.map((delta) => [delta.profileId, { delta: delta.delta }])
  )

  const changes = buildRatingChanges(nextPlayers, previousPlayers, wasRated)
  const eventType: RatingEventType = wasRated ? 'adjust' : 'apply'

  await applyRatingChanges(
    supabaseAdmin,
    communityId,
    gameId,
    changes,
    eventType
  )

  const storedRatingRow = await storeRatingSnapshot(supabaseAdmin, ratingRow, {
    gameId,
    communityId,
    teamAId: context.teamAId,
    teamBId: context.teamBId,
    goalDiff: context.goalDiff,
    teamARating,
    teamBRating,
    rated: true,
  })

  const playerPayload = playerDeltas.map((delta) => {
    const pre = resolvePreRating(delta.profileId)
    const teamId = delta.teamSide === 'A' ? context.teamAId! : context.teamBId!
    return {
      profileId: delta.profileId,
      teamId,
      teamSide: delta.teamSide,
      preRating: pre.rating,
      preRatedGames: pre.ratedGames,
      kUsed: delta.kUsed,
      delta: delta.delta,
    }
  })

  await upsertRatingPlayers(
    supabaseAdmin,
    storedRatingRow.id,
    communityId,
    gameId,
    playerPayload
  )

  if (ratingRow) {
    const existingIds = new Set(previousPlayers.keys())
    const nextIds = new Set(rosterProfileIds)
    const removed = Array.from(existingIds).filter((profileId) => !nextIds.has(profileId))
    await pruneRatingPlayers(supabaseAdmin, gameId, removed)
  }
}
