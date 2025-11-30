import assert from 'node:assert/strict'

import type { GameDetail } from '../types'
import { deriveDraftViewModel } from './deriveDraftViewModel'

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
  waitlistCapacity: 50,
    status: 'scheduled',
    draftStatus: 'pending',
    draftStatusLabel: null,
    confirmedCount: 0,
    waitlistedCount: 0,
    userStatus: 'none',
    userEntry: null,
    confirmedAt: null,
    cancelledAt: null,
    queue: [],
    captains: [],
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
    status: overrides.status ?? 'confirmed',
    joinedAt: overrides.joinedAt ?? '2025-01-01T09:00:00.000Z',
    promotedAt: overrides.promotedAt ?? null,
    cancelledAt: overrides.cancelledAt ?? null,
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

const run = () => {
  const gameDetail = baseGameDetail()
  gameDetail.captains = [buildCaptain(), buildCaptain({ slot: 2, profileId: 'captain-2', player: { id: 'captain-2', name: 'Casey Two', avatarUrl: null } })]
  gameDetail.queue = [
    buildQueueEntry({ profileId: 'captain-1', player: { id: 'captain-1', name: 'Alex One', avatarUrl: null } }),
    buildQueueEntry({ id: 'queue-2', profileId: 'player-2', player: { id: 'player-2', name: 'Jordan Two', avatarUrl: null } }),
    buildQueueEntry({ id: 'queue-3', profileId: 'player-3', player: { id: 'player-3', name: 'Sky Three', avatarUrl: null }, status: 'confirmed' }),
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

  assert.equal(model.confirmedPlayers.length, 2, 'should exclude captain from confirmed list')
  assert.equal(model.availablePlayers.length, 1, 'one player should remain available after drafted exclusion')
  assert.equal(model.canPick, true, 'captain on turn should be allowed to pick')
  assert.equal(model.allDrafted, false, 'still has available players')
  assert.equal(model.captainNameByTeamId.get('team-1'), 'Captain One', 'captain name map should resolve team name')
  assert.equal(model.currentRound, 2, 'optimistic pick should advance round calculation')

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

  assert.equal(spectatorModel.canPick, false, 'non-admin spectator cannot pick')
  assert.equal(spectatorModel.isSpectator, true, 'spectator flag should mirror pick eligibility')
  assert.equal(spectatorModel.currentRound, 1, 'round defaults to 1 when no picks have happened yet')
}

run()
console.log('deriveDraftViewModel checks passed')
