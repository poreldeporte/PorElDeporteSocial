import assert from 'node:assert/strict'

import type { GameDetail, QueueEntry } from './types'
import { computeGameDetailState } from './useGameDetailState'

let queueCounter = 0
const buildQueueEntry = (overrides: Partial<QueueEntry> = {}): QueueEntry => {
  const player =
    overrides.player ??
    ({
      id: overrides.profileId ?? 'profile-1',
      name: 'Player',
      avatarUrl: null,
    } as QueueEntry['player'])

  return {
    id: overrides.id ?? `queue-${++queueCounter}`,
    status: overrides.status ?? 'confirmed',
    joinedAt: overrides.joinedAt ?? '2025-01-01T00:00:00.000Z',
    promotedAt: overrides.promotedAt ?? null,
    cancelledAt: overrides.cancelledAt ?? null,
    attendanceConfirmedAt: overrides.attendanceConfirmedAt ?? null,
    profileId: overrides.profileId ?? 'profile-1',
    player,
  }
}

const baseGame: GameDetail = {
  id: 'game-1',
  name: 'Sunrise Kickoff',
  description: null,
  startTime: '2025-01-10T10:00:00.000Z',
  endTime: null,
  locationName: null,
  locationNotes: null,
  costCents: 2500,
  capacity: 12,
  waitlistCapacity: 50,
  status: 'scheduled',
  draftStatus: 'pending',
  cancelledAt: null,
  queue: [],
  captains: [],
  teams: [],
  result: null,
  confirmedCount: 0,
  waitlistedCount: 0,
  userStatus: 'none',
  userEntry: undefined,
}

const run = () => {
  const waitlistedState = computeGameDetailState({
    game: {
      ...baseGame,
      queue: [
        buildQueueEntry({
          status: 'waitlisted',
          profileId: 'profile-2',
          player: { id: 'profile-2', name: 'Waitlister', avatarUrl: null },
        }),
      ],
      waitlistedCount: 2,
      confirmedCount: 12,
      waitlistCapacity: 50,
    },
    queueState: { pendingGameId: null, isPending: false },
  })

  assert.equal(waitlistedState.waitlistFull, true, 'waitlist should be full')
  assert.equal(waitlistedState.canJoin, false, 'join CTA should be disabled')
  assert.equal(waitlistedState.ctaDisabled, true, 'CTA disabled when join impossible')

  const confirmedEntry = buildQueueEntry({
    profileId: 'profile-3',
    player: { id: 'profile-3', name: 'Starter', avatarUrl: null },
  })
  const confirmState = computeGameDetailState({
    game: {
      ...baseGame,
      queue: [confirmedEntry],
      confirmedCount: 1,
      userStatus: 'confirmed',
    },
    userId: 'profile-3',
    queueState: { pendingGameId: null, isPending: false },
    now: new Date('2025-01-09T12:00:00.000Z').getTime(),
  })

  assert.equal(confirmState.ctaState, 'leave-confirmed', 'confirmed user sees leave CTA')
  assert.equal(confirmState.canConfirmAttendance, true, 'confirmed user can confirm attendance')
  assert.equal(confirmState.userEntry?.id, confirmedEntry.id, 'returns active user entry')

  const staleStatusState = computeGameDetailState({
    game: {
      ...baseGame,
      queue: [confirmedEntry],
      confirmedCount: 1,
      userStatus: 'none',
    },
    userId: 'profile-3',
    queueState: { pendingGameId: null, isPending: false },
  })

  assert.equal(staleStatusState.ctaState, 'leave-confirmed', 'prefers queue entry status when userStatus stale')
}

run()
console.log('useGameDetailState checks passed')
