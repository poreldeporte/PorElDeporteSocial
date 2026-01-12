import { describe, expect, it } from 'vitest'
import type { GameDetail, QueueEntry } from './types'
import { computeGameDetailState } from './useGameDetailState'

let queueCounter = 0
const buildQueueEntry = (overrides: Partial<QueueEntry> = {}): QueueEntry => {
  const resolvedProfileId = overrides.profileId ?? 'profile-1'
  const resolvedId = overrides.id ?? `queue-${++queueCounter}`
  const isGuest = overrides.isGuest ?? false
  const playerId = overrides.playerId ?? (isGuest ? resolvedId : resolvedProfileId)
  const player =
    overrides.player ??
    ({
      id: playerId,
      name: 'Player',
      avatarUrl: null,
    } as QueueEntry['player'])

  return {
    id: resolvedId,
    status: overrides.status ?? 'rostered',
    joinedAt: overrides.joinedAt ?? '2025-01-01T00:00:00.000Z',
    promotedAt: overrides.promotedAt ?? null,
    droppedAt: overrides.droppedAt ?? null,
    attendanceConfirmedAt: overrides.attendanceConfirmedAt ?? null,
    profileId: isGuest ? null : resolvedProfileId,
    playerId,
    isGuest,
    guest: overrides.guest ?? null,
    player,
  }
}

const baseGame: GameDetail = {
  id: 'game-1',
  name: 'Sunrise Kickoff',
  description: null,
  startTime: '2025-01-10T10:00:00.000Z',
  endTime: null,
  releaseAt: null,
  releasedAt: null,
  locationName: null,
  locationNotes: null,
  costCents: 2500,
  capacity: 12,
  status: 'scheduled',
  draftStatus: 'pending',
  cancelledAt: null,
  queue: [],
  captains: [],
  teams: [],
  result: null,
  rosteredCount: 0,
  waitlistedCount: 0,
  userStatus: 'none',
  userEntry: undefined,
  hasReview: false,
  communityId: 'community-1',
  confirmationEnabled: true,
  joinCutoffOffsetMinutesFromKickoff: 0,
  draftModeEnabled: true,
  draftVisibility: 'public',
  draftChatEnabled: true,
  crunchTimeStartTimeLocal: null,
  community: null,
}

describe('computeGameDetailState', () => {
  it('keeps waitlist join available when roster is full', () => {
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
        rosteredCount: 12,
      },
      queueState: { pendingGameId: null, isPending: false },
      now: new Date('2025-01-09T12:00:00.000Z').getTime(),
    })

    expect(waitlistedState.ctaLabel).toBe('Join waitlist')
    expect(waitlistedState.canJoin).toBe(true)
    expect(waitlistedState.ctaDisabled).toBe(false)
  })

  it('sets confirmation window to 24 hours before kickoff', () => {
    const state = computeGameDetailState({
      game: baseGame,
      queueState: { pendingGameId: null, isPending: false },
    })

    expect(state.confirmationWindowStart?.getTime()).toBe(
      new Date('2025-01-09T10:00:00.000Z').getTime()
    )
  })

  it('returns active user entry and confirmation ability', () => {
    const rosteredEntry = buildQueueEntry({
      profileId: 'profile-3',
      player: { id: 'profile-3', name: 'Starter', avatarUrl: null },
    })
    const confirmState = computeGameDetailState({
      game: {
        ...baseGame,
        queue: [rosteredEntry],
        rosteredCount: 1,
        userStatus: 'rostered',
      },
      userId: 'profile-3',
      queueState: { pendingGameId: null, isPending: false },
      now: new Date('2025-01-09T12:00:00.000Z').getTime(),
    })

    expect(confirmState.ctaState).toBe('drop')
    expect(confirmState.canConfirmAttendance).toBe(true)
    expect(confirmState.userEntry?.id).toBe(rosteredEntry.id)
  })

  it('prefers queue entry status when userStatus is stale', () => {
    const rosteredEntry = buildQueueEntry({
      profileId: 'profile-3',
      player: { id: 'profile-3', name: 'Starter', avatarUrl: null },
    })
    const staleStatusState = computeGameDetailState({
      game: {
        ...baseGame,
        queue: [rosteredEntry],
        rosteredCount: 1,
        userStatus: 'none',
      },
      userId: 'profile-3',
      queueState: { pendingGameId: null, isPending: false },
    })

    expect(staleStatusState.ctaState).toBe('drop')
  })

  it('limits rating to rostered players after completion', () => {
    const rosteredEntry = buildQueueEntry({
      profileId: 'profile-4',
      player: { id: 'profile-4', name: 'Finisher', avatarUrl: null },
    })
    const rosteredState = computeGameDetailState({
      game: {
        ...baseGame,
        status: 'completed',
        queue: [rosteredEntry],
        rosteredCount: 1,
        userStatus: 'rostered',
      },
      userId: 'profile-4',
      queueState: { pendingGameId: null, isPending: false },
    })

    expect(rosteredState.ctaLabel).toBe('Rate the game')
    expect(rosteredState.ctaDisabled).toBe(false)

    const nonRosteredState = computeGameDetailState({
      game: {
        ...baseGame,
        status: 'completed',
        queue: [],
        rosteredCount: 0,
        userStatus: 'none',
      },
      userId: 'profile-5',
      queueState: { pendingGameId: null, isPending: false },
    })

    expect(nonRosteredState.ctaLabel).toBe('Game completed')
    expect(nonRosteredState.ctaDisabled).toBe(true)
  })

  it('does not offer rating before completion', () => {
    const rosteredEntry = buildQueueEntry({
      profileId: 'profile-6',
      player: { id: 'profile-6', name: 'Starter', avatarUrl: null },
    })
    const scheduledState = computeGameDetailState({
      game: {
        ...baseGame,
        status: 'scheduled',
        queue: [rosteredEntry],
        rosteredCount: 1,
        userStatus: 'rostered',
      },
      userId: 'profile-6',
      queueState: { pendingGameId: null, isPending: false },
      now: new Date('2025-01-10T11:30:00.000Z').getTime(),
    })

    expect(scheduledState.ctaLabel).toBe('Drop')
    expect(scheduledState.ctaDisabled).toBe(true)
  })
})
