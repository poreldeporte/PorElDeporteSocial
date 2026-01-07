import type { StatusTone } from './components/GameStatus'
import type { GameStatus } from './types'

type AvailabilityState = 'open' | 'waitlist' | 'locked' | 'cancelled' | 'completed'

export type AvailabilityDescriptor = {
  state: AvailabilityState
  label: string
  tone: StatusTone
}

export const deriveAvailabilityStatus = ({
  status,
  confirmedCount,
  capacity,
  attendanceConfirmedCount,
  waitlistedCount: _waitlistedCount,
  waitlistCapacity,
}: {
  status: GameStatus
  confirmedCount: number
  capacity: number
  attendanceConfirmedCount?: number
  waitlistedCount?: number
  waitlistCapacity?: number
}): AvailabilityDescriptor => {
  if (status === 'cancelled') return { state: 'cancelled', label: 'Cancelled', tone: 'warning' }
  if (status === 'completed') return { state: 'completed', label: 'Completed', tone: 'neutral' }
  if (status === 'locked') return { state: 'locked', label: 'Locked', tone: 'neutral' }

  const rosterFilled = confirmedCount >= capacity
  if (!rosterFilled) {
    return { state: 'open', label: 'Spots open', tone: 'success' }
  }

  const confirmedAttendanceCount =
    attendanceConfirmedCount !== undefined ? attendanceConfirmedCount : confirmedCount
  const waitlistEnabled = typeof waitlistCapacity === 'number' && waitlistCapacity > 0
  if (!waitlistEnabled) return { state: 'locked', label: 'Locked', tone: 'neutral' }
  if (confirmedAttendanceCount >= capacity) return { state: 'locked', label: 'Locked', tone: 'neutral' }

  return { state: 'waitlist', label: 'Waitlist', tone: 'warning' }
}

type QueueStatus = 'confirmed' | 'waitlisted' | 'cancelled' | 'none'

export const deriveUserBadge = ({
  queueStatus,
  attendanceConfirmed,
  canConfirmAttendance,
}: {
  queueStatus?: QueueStatus | null
  attendanceConfirmed?: boolean
  canConfirmAttendance?: boolean
}): { label: string; tone: StatusTone } | null => {
  if (!queueStatus || queueStatus === 'none') return null
  if (queueStatus === 'confirmed') {
    return attendanceConfirmed
      ? { label: 'Confirmed', tone: 'success' }
      : canConfirmAttendance
        ? { label: 'Confirm spot', tone: 'neutral' }
        : { label: 'On roster', tone: 'neutral' }
  }
  if (queueStatus === 'waitlisted') return { label: 'On waitlist', tone: 'warning' }
  if (queueStatus === 'cancelled') return null
  return null
}

export type CombinedStatus = { label: string; tone: StatusTone } | null

export const getConfirmCountdownLabel = ({
  confirmationWindowStart,
  isConfirmationOpen,
  userStatus,
  attendanceConfirmedAt,
  gameStatus,
  now = Date.now(),
}: {
  confirmationWindowStart?: Date | null
  isConfirmationOpen?: boolean
  userStatus?: QueueStatus | null
  attendanceConfirmedAt?: string | null
  gameStatus?: GameStatus
  now?: number
}) => {
  if (userStatus !== 'confirmed') return null
  if (attendanceConfirmedAt) return null
  if (isConfirmationOpen) return null
  if (gameStatus === 'cancelled' || gameStatus === 'completed') return null
  if (!confirmationWindowStart) return null
  const remainingMs = confirmationWindowStart.getTime() - now
  if (remainingMs <= 0) return null
  const hours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)))
  return `Confirm in ${hours}h`
}

export const deriveCombinedStatus = ({
  gameStatus,
  confirmedCount,
  capacity,
  attendanceConfirmedCount,
  waitlistedCount,
  waitlistCapacity,
  userStatus,
  attendanceConfirmed,
  canConfirmAttendance,
}: {
  gameStatus: GameStatus
  confirmedCount: number
  capacity: number
  attendanceConfirmedCount?: number
  waitlistedCount?: number
  waitlistCapacity?: number
  userStatus?: QueueStatus | null
  attendanceConfirmed?: boolean
  canConfirmAttendance?: boolean
}): CombinedStatus => {
  const isUserOnRoster = userStatus === 'confirmed'
  const availability = deriveAvailabilityStatus({
    status: gameStatus,
    confirmedCount,
    capacity,
    attendanceConfirmedCount,
    waitlistedCount,
    waitlistCapacity,
  })
  const userBadge = deriveUserBadge({
    queueStatus: userStatus,
    attendanceConfirmed,
    canConfirmAttendance,
  })
  if (availability?.state === 'cancelled') {
    return { label: 'Game cancelled', tone: 'warning' }
  }
  if (availability?.state === 'completed') {
    return { label: 'Game completed', tone: 'neutral' }
  }

  if (userBadge?.label === 'Confirmed') return { label: userBadge.label, tone: userBadge.tone }
  if (userBadge?.label === 'Confirm spot') return { label: userBadge.label, tone: userBadge.tone }
  if (userBadge?.label === 'On roster') return { label: userBadge.label, tone: userBadge.tone }
  if (userBadge?.label === 'On waitlist') return { label: userBadge.label, tone: userBadge.tone }

  if (availability?.state === 'locked' && !isUserOnRoster) {
    return { label: 'Roster full', tone: 'neutral' }
  }
  if (availability?.state === 'waitlist') {
    return { label: 'Waitlist open', tone: availability.tone }
  }
  if (availability?.state === 'open') {
    return { label: 'Spots open', tone: availability.tone }
  }

  return null
}

export const deriveUserStateMessage = ({
  queueStatus,
  attendanceConfirmed,
  canConfirmAttendance,
  confirmationWindowStart,
  gameStatus,
  spotsLeft,
}: {
  queueStatus?: QueueStatus | null
  attendanceConfirmed?: boolean
  canConfirmAttendance: boolean
  confirmationWindowStart?: Date | null
  gameStatus: GameStatus
  spotsLeft: number
}) => {
  if (gameStatus === 'cancelled') return 'This run was cancelled.'
  if (gameStatus === 'completed') return 'This run already wrapped.'
  if (queueStatus === 'confirmed') {
    if (attendanceConfirmed) return 'You’re locked in. Drop out only if life or death.'
    if (canConfirmAttendance) return 'Confirm spot now.'
    return 'You’re on the roster.'
  }
  if (queueStatus === 'waitlisted') return 'You’re on the waitlist. We’ll ping you if a spot opens.'
  if (gameStatus === 'locked') return 'Roster full.'
  if (spotsLeft > 0) return 'Spots open—tap to grab one.'
  return 'Join the waitlist and we’ll ping you if a spot opens.'
}
