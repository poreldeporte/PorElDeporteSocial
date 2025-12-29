import { describe, expect, it } from 'vitest'

import {
  deriveAvailabilityStatus,
  deriveCombinedStatus,
  deriveUserBadge,
  deriveUserStateMessage,
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
    const combinedNonRoster = deriveCombinedStatus({
      gameStatus: 'scheduled',
      confirmedCount: 10,
      capacity: 10,
      attendanceConfirmedCount: 9,
      waitlistedCount: 0,
      waitlistCapacity: 0,
      userStatus: 'none',
      attendanceConfirmed: false,
    })
    expect(combinedNonRoster).toEqual({ label: 'Pending Confirmations', tone: 'neutral' })

    const combinedRoster = deriveCombinedStatus({
      gameStatus: 'scheduled',
      confirmedCount: 10,
      capacity: 10,
      attendanceConfirmedCount: 9,
      waitlistedCount: 0,
      waitlistCapacity: 0,
      userStatus: 'confirmed',
      attendanceConfirmed: false,
      canConfirmAttendance: false,
    })
    expect(combinedRoster).toEqual({ label: 'On roster', tone: 'neutral' })
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
    const combined = deriveCombinedStatus({
      gameStatus: 'scheduled',
      confirmedCount: 10,
      capacity: 10,
      attendanceConfirmedCount: 9,
      waitlistedCount: 2,
      waitlistCapacity: 5,
      userStatus: 'none',
      attendanceConfirmed: false,
    })
    expect(combined).toEqual({ label: 'Waitlist', tone: 'warning' })
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
    expect(confirmPrompt).toBe('Confirm spot now.')
  })

  it('handles waitlist message for non-rostered user', () => {
    const message = deriveUserStateMessage({
      queueStatus: 'none',
      attendanceConfirmed: false,
      waitlistFull: true,
      canConfirmAttendance: false,
      confirmationWindowStart: null,
      gameStatus: 'scheduled',
      spotsLeft: 0,
    })
    expect(message).toBe('Join the waitlist and we’ll ping you if a spot opens.')
  })

  it('derives combined status with user priority', () => {
    const combined = deriveCombinedStatus({
      gameStatus: 'scheduled',
      confirmedCount: 10,
      capacity: 10,
      attendanceConfirmedCount: 10,
      waitlistedCount: 2,
      waitlistCapacity: 5,
      userStatus: 'confirmed',
      attendanceConfirmed: true,
      canConfirmAttendance: true,
    })
    expect(combined).toEqual({ label: 'Confirmed', tone: 'success' })
  })

  it('derives combined status when locked and user not on roster', () => {
    const combined = deriveCombinedStatus({
      gameStatus: 'scheduled',
      confirmedCount: 10,
      capacity: 10,
      attendanceConfirmedCount: 9,
      waitlistedCount: 0,
      waitlistCapacity: 0,
      userStatus: 'none',
      attendanceConfirmed: false,
      canConfirmAttendance: false,
    })
    expect(combined).toEqual({ label: 'Pending Confirmations', tone: 'neutral' })
  })

  it('derives combined status for rostered user before confirmation window', () => {
    const combined = deriveCombinedStatus({
      gameStatus: 'scheduled',
      confirmedCount: 10,
      capacity: 10,
      attendanceConfirmedCount: 9,
      waitlistedCount: 0,
      waitlistCapacity: 0,
      userStatus: 'confirmed',
      attendanceConfirmed: false,
      canConfirmAttendance: false,
    })
    expect(combined).toEqual({ label: 'On roster', tone: 'neutral' })
  })

  it('derives combined status for rostered user when confirmation open', () => {
    const combined = deriveCombinedStatus({
      gameStatus: 'scheduled',
      confirmedCount: 10,
      capacity: 10,
      attendanceConfirmedCount: 9,
      waitlistedCount: 0,
      waitlistCapacity: 0,
      userStatus: 'confirmed',
      attendanceConfirmed: false,
      canConfirmAttendance: true,
    })
    expect(combined).toEqual({ label: 'Confirm spot', tone: 'neutral' })
  })

  it('derives combined status for cancelled game regardless of user badge', () => {
    const combined = deriveCombinedStatus({
      gameStatus: 'cancelled',
      confirmedCount: 0,
      capacity: 10,
      attendanceConfirmedCount: 0,
      waitlistedCount: 0,
      waitlistCapacity: 0,
      userStatus: 'confirmed',
      attendanceConfirmed: true,
      canConfirmAttendance: true,
    })
    expect(combined).toEqual({ label: 'Game cancelled', tone: 'warning' })
  })
})
