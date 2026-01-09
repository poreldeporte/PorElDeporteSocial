import type { GameDetail, QueueEntry } from '../types'

type DraftTeam = {
  id: string
  captain_profile_id: string | null
  draft_order: number
  game_team_members:
    | {
        id: string
        profile_id: string | null
        guest_queue_id?: string | null
        pick_order?: number | null
        assigned_at: string
        profiles: { name: string | null; avatar_url: string | null } | null
        game_queue?: {
          id: string
          guest_name: string | null
          guest_phone: string | null
          guest_notes: string | null
          added_by_profile_id: string | null
        } | null
      }[]
    | null
  name: string
}

type DraftMeta = {
  draft_status: GameDetail['draftStatus'] | null
  draft_turn: number | null
  draft_direction: number | null
} | null

export type DraftViewModelArgs = {
  gameDetail?: GameDetail | null
  gameMeta?: DraftMeta
  teams: DraftTeam[]
  draftedPlayerIds: Set<string>
  optimisticPicks: string[]
  captainTeam?: DraftTeam | null
  currentTurnTeam?: DraftTeam | null
  isAdmin: boolean
  isCaptainTurn: boolean
}

export type DraftViewModel = ReturnType<typeof deriveDraftViewModel>

const sortRostered = (entries: QueueEntry[]) =>
  [...entries].sort(
    (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  )

const getCombinedDraftedIds = (
  draftedPlayerIds: Set<string>,
  optimisticPicks: string[]
) => {
  const combined = new Set(draftedPlayerIds)
  optimisticPicks.forEach((id) => combined.add(id))
  return combined
}

const getCaptainNameMap = (teams: DraftTeam[], captains: GameDetail['captains']) => {
  const map = new Map<string, string>()
  teams.forEach((team) => {
    const captain =
      captains.find((c) => c.profileId === team.captain_profile_id) ??
      captains.find((c) => c.slot === team.draft_order + 1)
    if (captain?.player.name) {
      map.set(team.id, captain.player.name)
    }
  })
  return map
}

export const deriveDraftViewModel = ({
  gameDetail,
  gameMeta,
  teams,
  draftedPlayerIds,
  optimisticPicks,
  captainTeam,
  currentTurnTeam,
  isAdmin,
  isCaptainTurn,
}: DraftViewModelArgs) => {
  const draftStatus = gameDetail?.draftStatus ?? gameMeta?.draft_status ?? 'pending'
  const captains = gameDetail?.captains ?? []
  const captainIds = new Set(captains.map((captain) => captain.profileId))

  const rosteredRoster = sortRostered(
    (gameDetail?.queue ?? []).filter((entry) => entry.status === 'rostered')
  )
  const rosteredPlayers = rosteredRoster.filter(
    (entry) => !entry.profileId || !captainIds.has(entry.profileId)
  )
  const combinedDraftedPlayerIds = getCombinedDraftedIds(draftedPlayerIds, optimisticPicks)
  const availablePlayers = rosteredPlayers.filter(
    (entry) => !combinedDraftedPlayerIds.has(entry.player.id)
  )

  const totalDrafted = rosteredPlayers.length - availablePlayers.length
  const allDrafted = rosteredPlayers.length > 0 && availablePlayers.length === 0
  const hasCaptains = captains.length >= 2

  const captainNameByTeamId = getCaptainNameMap(teams, captains)
  const canPick =
    draftStatus === 'in_progress' && (isAdmin || (!!captainTeam && isCaptainTurn))
  const isSpectator = !canPick && draftStatus === 'in_progress'
  const optimisticPickCount = optimisticPicks.length
  const teamCount = teams.length || 1
  const pickNumberWithPending =
    totalDrafted + (optimisticPickCount > 0 ? optimisticPickCount : 0) + 1
  const currentRound = Math.max(1, Math.ceil(pickNumberWithPending / teamCount))

  const nextTeam = (() => {
    if (!teams.length || typeof gameMeta?.draft_turn !== 'number') return null
    let nextTurn = gameMeta.draft_turn + (gameMeta.draft_direction ?? 1)
    let nextDirection = gameMeta.draft_direction ?? 1
    if (nextTurn >= teams.length) {
      nextDirection = -1
      nextTurn = teams.length - 1
    } else if (nextTurn < 0) {
      nextDirection = 1
      nextTurn = 0
    }
    return teams.find((team) => team.draft_order === nextTurn) ?? null
  })()

  return {
    draftStatus,
    captains,
    captainIds,
    rosteredRoster,
    rosteredPlayers,
    availablePlayers,
    combinedDraftedPlayerIds,
    totalDrafted,
    allDrafted,
    hasCaptains,
    captainNameByTeamId,
    canPick,
    isSpectator,
    optimisticPickCount,
    pickNumberWithPending,
    currentRound,
    nextTeamName: nextTeam?.name ?? null,
    currentCaptainTeam: currentTurnTeam ?? null,
  }
}
