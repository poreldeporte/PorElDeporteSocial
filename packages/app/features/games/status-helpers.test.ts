import { describe, expect, it } from 'vitest'

import {
  deriveAvailabilityStatus,
  deriveCombinedStatus,
  deriveUserBadge,
  deriveUserStateMessage,
  getConfirmCountdownLabel,
} from './status-helpers'

describe('status-helpers', () => {
  it('returns locked status when join cutoff passes', () => {
    const availability = deriveAvailabilityStatus({
      status: 'scheduled',
      rosteredCount: 10,
      capacity: 10,
      isLocked: true,
    })

    expect(availability.state).toBe('locked')
    const combinedNonRoster = deriveCombinedStatus({
      gameStatus: 'scheduled',
      rosteredCount: 10,
      capacity: 10,
      isLocked: true,
      userStatus: 'none',
      attendanceConfirmed: false,
    })
    expect(combinedNonRoster).toEqual({ label: 'Locked', tone: 'neutral' })

    const combinedRoster = deriveCombinedStatus({
      gameStatus: 'scheduled',
      rosteredCount: 10,
      capacity: 10,
      isLocked: true,
      userStatus: 'rostered',
      attendanceConfirmed: false,
      canConfirmAttendance: false,
    })
    expect(combinedRoster).toEqual({ label: 'On roster', tone: 'neutral' })
  })

  it('shows waitlist open when roster is full', () => {
    const availability = deriveAvailabilityStatus({
      status: 'scheduled',
      rosteredCount: 10,
      capacity: 10,
    })

    expect(availability.state).toBe('waitlist')
    const combined = deriveCombinedStatus({
      gameStatus: 'scheduled',
      rosteredCount: 10,
      capacity: 10,
      userStatus: 'none',
      attendanceConfirmed: false,
    })
    expect(combined).toEqual({ label: 'Waitlist open', tone: 'warning' })
  })

  it('describes confirmed badge and attendance prompts', () => {
    const badge = deriveUserBadge({ queueStatus: 'rostered', attendanceConfirmed: true })
    expect(badge).toEqual({ label: 'Confirmed', tone: 'success' })

    const confirmPrompt = deriveUserStateMessage({
      queueStatus: 'rostered',
      attendanceConfirmed: false,
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
      rosteredCount: 10,
      capacity: 10,
      userStatus: 'rostered',
      attendanceConfirmed: true,
      canConfirmAttendance: true,
    })
    expect(combined).toEqual({ label: 'Confirmed', tone: 'success' })
  })

  it('derives combined status when locked and user not on roster', () => {
    const combined = deriveCombinedStatus({
      gameStatus: 'scheduled',
      rosteredCount: 10,
      capacity: 10,
      isLocked: true,
      userStatus: 'none',
      attendanceConfirmed: false,
      canConfirmAttendance: false,
    })
    expect(combined).toEqual({ label: 'Locked', tone: 'neutral' })
  })

  it('derives combined status for rostered user before confirmation window', () => {
    const combined = deriveCombinedStatus({
      gameStatus: 'scheduled',
      rosteredCount: 10,
      capacity: 10,
      userStatus: 'rostered',
      attendanceConfirmed: false,
      canConfirmAttendance: false,
    })
    expect(combined).toEqual({ label: 'On roster', tone: 'neutral' })
  })

  it('derives combined status for rostered user when confirmation open', () => {
    const combined = deriveCombinedStatus({
      gameStatus: 'scheduled',
      rosteredCount: 10,
      capacity: 10,
      userStatus: 'rostered',
      attendanceConfirmed: false,
      canConfirmAttendance: true,
    })
    expect(combined).toEqual({ label: 'Confirm spot', tone: 'neutral' })
  })

  it('derives combined status for cancelled game regardless of user badge', () => {
    const combined = deriveCombinedStatus({
      gameStatus: 'cancelled',
      rosteredCount: 0,
      capacity: 10,
      userStatus: 'rostered',
      attendanceConfirmed: true,
      canConfirmAttendance: true,
    })
    expect(combined).toEqual({ label: 'Game cancelled', tone: 'warning' })
  })

  it('formats confirm countdown for rostered users before the window opens', () => {
    const now = new Date('2024-01-01T10:00:00Z').getTime()
    const confirmationWindowStart = new Date(now + 90 * 60 * 1000)
    const label = getConfirmCountdownLabel({
      confirmationWindowStart,
      isConfirmationOpen: false,
      userStatus: 'rostered',
      attendanceConfirmedAt: null,
      gameStatus: 'scheduled',
      now,
    })
    expect(label).toBe('Confirm in 2h')
  })

  it('skips confirm countdown when window is open or user already confirmed', () => {
    const now = new Date('2024-01-01T10:00:00Z').getTime()
    const confirmationWindowStart = new Date(now - 5 * 60 * 1000)
    const openLabel = getConfirmCountdownLabel({
      confirmationWindowStart,
      isConfirmationOpen: true,
      userStatus: 'rostered',
      attendanceConfirmedAt: null,
      gameStatus: 'scheduled',
      now,
    })
    expect(openLabel).toBeNull()

    const confirmedLabel = getConfirmCountdownLabel({
      confirmationWindowStart: new Date(now + 60 * 60 * 1000),
      isConfirmationOpen: false,
      userStatus: 'rostered',
      attendanceConfirmedAt: '2024-01-01T08:00:00Z',
      gameStatus: 'scheduled',
      now,
    })
    expect(confirmedLabel).toBeNull()
  })
})
