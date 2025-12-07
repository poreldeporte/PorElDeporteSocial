import { describe, expect, it } from 'vitest'

import {
  deriveAvailabilityStatus,
  deriveUserBadge,
  deriveUserStateMessage,
  describeAvailability,
} from './status-helpers'

describe('status-helpers', () => {
  it('locks roster when full and waitlist disabled', () => {
    const availability = deriveAvailabilityStatus({
      status: 'scheduled',
      confirmedCount: 10,
      capacity: 10,
      attendanceConfirmedCount: 9,
      waitlistedCount: 0,
      waitlistCapacity: 0,
    })

    expect(availability.state).toBe('locked')
    expect(describeAvailability(availability)).toBe('Roster locked')
  })

  it('keeps waitlist open when enabled', () => {
    const availability = deriveAvailabilityStatus({
      status: 'scheduled',
      confirmedCount: 10,
      capacity: 10,
      attendanceConfirmedCount: 9,
      waitlistedCount: 2,
      waitlistCapacity: 5,
    })

    expect(availability.state).toBe('waitlist')
    expect(describeAvailability(availability)).toBe('Waitlist open')
  })

  it('describes confirmed badge and attendance prompts', () => {
    const badge = deriveUserBadge({ queueStatus: 'confirmed', attendanceConfirmed: true })
    expect(badge).toEqual({ label: 'Confirmed', tone: 'success' })

    const confirmPrompt = deriveUserStateMessage({
      queueStatus: 'confirmed',
      attendanceConfirmed: false,
      waitlistFull: false,
      canConfirmAttendance: true,
      confirmationWindowStart: new Date('2024-01-01T10:00:00Z'),
      gameStatus: 'scheduled',
      spotsLeft: 0,
    })
    expect(confirmPrompt).toBe('Confirm attendance now.')
  })

  it('handles waitlist full message for non-rostered user', () => {
    const message = deriveUserStateMessage({
      queueStatus: 'none',
      attendanceConfirmed: false,
      waitlistFull: true,
      canConfirmAttendance: false,
      confirmationWindowStart: null,
      gameStatus: 'scheduled',
      spotsLeft: 0,
    })
    expect(message).toBe('Waitlist is full. Keep an eye on notifications.')
  })
})
