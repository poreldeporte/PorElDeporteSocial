import { describe, expect, it } from 'vitest'
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

describe('computeGameDetailState', () => {
  it('disables join when waitlist is full', () => {
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
        waitlistCapacity: 1,
      },
      queueState: { pendingGameId: null, isPending: false },
    })

    expect(waitlistedState.waitlistFull).toBe(true)
    expect(waitlistedState.canJoin).toBe(false)
    expect(waitlistedState.ctaDisabled).toBe(true)
  })

  it('returns active user entry and confirmation ability', () => {
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

    expect(confirmState.ctaState).toBe('leave-confirmed')
    expect(confirmState.canConfirmAttendance).toBe(true)
    expect(confirmState.userEntry?.id).toBe(confirmedEntry.id)
  })

  it('prefers queue entry status when userStatus is stale', () => {
    const confirmedEntry = buildQueueEntry({
      profileId: 'profile-3',
      player: { id: 'profile-3', name: 'Starter', avatarUrl: null },
    })
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

    expect(staleStatusState.ctaState).toBe('leave-confirmed')
  })
})
