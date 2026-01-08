import type { GameDetail } from '../types'
import { deriveDraftViewModel } from './deriveDraftViewModel'
import { describe, expect, it } from 'vitest'

type Captain = GameDetail['captains'][number]
type QueueEntry = GameDetail['queue'][number]

const baseGameDetail = (): GameDetail =>
  ({
    id: 'game-1',
    name: 'Sunrise Pickup',
    description: null,
    startTime: '2025-01-01T10:00:00.000Z',
    endTime: null,
    locationName: null,
    locationNotes: null,
    costCents: 0,
    capacity: 8,
    status: 'scheduled',
    draftStatus: 'pending',
    waitlistedCount: 0,
    rosteredCount: 0,
    userStatus: 'none',
    userEntry: null,
    hasReview: false,
    cancelledAt: null,
    queue: [],
    captains: [],
    teams: [],
    result: null,
    communityId: 'community-1',
    confirmationEnabled: true,
    joinCutoffOffsetMinutesFromKickoff: 0,
    draftModeEnabled: true,
    crunchTimeStartTimeLocal: null,
    community: null,
  }) as unknown as GameDetail

const buildCaptain = (overrides: Partial<Captain> = {}): Captain =>
  ({
    slot: overrides.slot ?? 1,
    profileId: overrides.profileId ?? 'captain-1',
    player: overrides.player ?? {
      id: overrides.profileId ?? 'captain-1',
      name: 'Captain One',
      avatarUrl: null,
    },
  }) as Captain

const buildQueueEntry = (overrides: Partial<QueueEntry> = {}): QueueEntry =>
  ({
    id: overrides.id ?? 'queue-1',
    status: overrides.status ?? 'rostered',
    joinedAt: overrides.joinedAt ?? '2025-01-01T09:00:00.000Z',
    promotedAt: overrides.promotedAt ?? null,
    droppedAt: overrides.droppedAt ?? null,
    attendanceConfirmedAt: overrides.attendanceConfirmedAt ?? null,
    profileId: overrides.profileId ?? 'player-1',
    player:
      overrides.player ??
      ({
        id: overrides.profileId ?? 'player-1',
        name: 'Player One',
        avatarUrl: null,
      } as QueueEntry['player']),
  }) as QueueEntry

const team = {
  id: 'team-1',
  name: 'Squad A',
  draft_order: 0,
  captain_profile_id: 'captain-1',
  game_team_members: [],
}

const teamB = {
  ...team,
  id: 'team-2',
  name: 'Squad B',
  draft_order: 1,
  captain_profile_id: 'captain-2',
}

describe('deriveDraftViewModel', () => {
  it('computes pickability and round state for captain and spectator', () => {
    const gameDetail = baseGameDetail()
    gameDetail.captains = [
      buildCaptain(),
      buildCaptain({
        slot: 2,
        profileId: 'captain-2',
        player: { id: 'captain-2', name: 'Casey Two', avatarUrl: null },
      }),
    ]
    gameDetail.queue = [
      buildQueueEntry({
        profileId: 'captain-1',
        player: { id: 'captain-1', name: 'Alex One', avatarUrl: null },
      }),
      buildQueueEntry({
        id: 'queue-2',
        profileId: 'player-2',
        player: { id: 'player-2', name: 'Jordan Two', avatarUrl: null },
      }),
      buildQueueEntry({
        id: 'queue-3',
        profileId: 'player-3',
        player: { id: 'player-3', name: 'Sky Three', avatarUrl: null },
        status: 'rostered',
      }),
    ]
    gameDetail.draftStatus = 'in_progress'

    const model = deriveDraftViewModel({
      gameDetail,
      gameMeta: { draft_status: 'in_progress', draft_turn: 0, draft_direction: 1 },
      teams: [team, teamB],
      draftedProfileIds: new Set(['player-2']),
      optimisticPicks: ['player-4'],
      captainTeam: team,
      currentTurnTeam: team,
      isAdmin: false,
      isCaptainTurn: true,
    })

    expect(model.rosteredPlayers).toHaveLength(2)
    expect(model.availablePlayers).toHaveLength(1)
    expect(model.canPick).toBe(true)
    expect(model.allDrafted).toBe(false)
    expect(model.captainNameByTeamId.get('team-1')).toBe('Captain One')
    expect(model.currentRound).toBe(2)

    const spectatorModel = deriveDraftViewModel({
      gameDetail,
      gameMeta: { draft_status: 'in_progress', draft_turn: 1, draft_direction: -1 },
      teams: [team, teamB],
      draftedProfileIds: new Set(),
      optimisticPicks: [],
      captainTeam: null,
      currentTurnTeam: teamB,
      isAdmin: false,
      isCaptainTurn: false,
    })

    expect(spectatorModel.canPick).toBe(false)
    expect(spectatorModel.isSpectator).toBe(true)
    expect(spectatorModel.currentRound).toBe(1)
  })
})
