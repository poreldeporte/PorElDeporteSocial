import { describe, expect, it, vi } from 'vitest'

import { getDraftStartBlocker } from './draft'

const baseSnapshot = {
  game: {
    id: 'game-1',
    draft_status: 'pending',
    capacity: 10,
    start_time: '2025-01-02T00:00:00.000Z',
    draft_mode_enabled: true,
    draft_visibility: 'public',
    confirmation_enabled: true,
    join_cutoff_offset_minutes_from_kickoff: 0,
  },
  community: {
    confirmation_window_hours_before_kickoff: 24,
  },
  rosteredCount: 10,
  attendanceConfirmedCount: 10,
}

describe('getDraftStartBlocker', () => {
  it('returns null when the draft is eligible', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T12:00:00.000Z'))
    const blocker = getDraftStartBlocker({ snapshot: baseSnapshot, captainCount: 2 })
    expect(blocker).toBeNull()
    vi.useRealTimers()
  })

  it('blocks when draft mode is off', () => {
    const blocker = getDraftStartBlocker({
      snapshot: { ...baseSnapshot, game: { ...baseSnapshot.game, draft_mode_enabled: false } },
      captainCount: 2,
    })
    expect(blocker).toBe('Draft mode is off for this game')
  })

  it('blocks when the roster is not fully confirmed', () => {
    const blocker = getDraftStartBlocker({
      snapshot: { ...baseSnapshot, attendanceConfirmedCount: 9 },
      captainCount: 2,
    })
    expect(blocker).toBe('All rostered players must confirm attendance before assigning captains')
  })

  it('blocks when the confirmation window is closed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-30T12:00:00.000Z'))
    const blocker = getDraftStartBlocker({ snapshot: baseSnapshot, captainCount: 2 })
    expect(blocker).toBe('Draft is only available within the confirmation window')
    vi.useRealTimers()
  })
})
