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
  rosteredCount,
  capacity,
  isLocked = false,
}: {
  status: GameStatus
  rosteredCount: number
  capacity: number
  isLocked?: boolean
}): AvailabilityDescriptor => {
  if (status === 'cancelled') return { state: 'cancelled', label: 'Cancelled', tone: 'warning' }
  if (status === 'completed') return { state: 'completed', label: 'Completed', tone: 'neutral' }
  if (isLocked) return { state: 'locked', label: 'Locked', tone: 'neutral' }

  if (rosteredCount < capacity) return { state: 'open', label: 'Spots open', tone: 'success' }
  return { state: 'waitlist', label: 'Waitlist open', tone: 'warning' }
}

type QueueStatus = 'rostered' | 'waitlisted' | 'dropped' | 'none'

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
  if (queueStatus === 'rostered') {
    return attendanceConfirmed
      ? { label: 'Confirmed', tone: 'success' }
      : canConfirmAttendance
        ? { label: 'Confirm spot', tone: 'neutral' }
        : { label: 'On roster', tone: 'neutral' }
  }
  if (queueStatus === 'waitlisted') return { label: 'On waitlist', tone: 'warning' }
  if (queueStatus === 'dropped') return null
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
  if (userStatus !== 'rostered') return null
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
  rosteredCount,
  capacity,
  isLocked,
  userStatus,
  attendanceConfirmed,
  canConfirmAttendance,
}: {
  gameStatus: GameStatus
  rosteredCount: number
  capacity: number
  isLocked?: boolean
  userStatus?: QueueStatus | null
  attendanceConfirmed?: boolean
  canConfirmAttendance?: boolean
}): CombinedStatus => {
  const isUserOnRoster = userStatus === 'rostered'
  const availability = deriveAvailabilityStatus({
    status: gameStatus,
    rosteredCount,
    capacity,
    isLocked,
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
    return { label: availability.label, tone: availability.tone }
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
  isLocked = false,
  isGrabOnly = false,
  spotsLeft,
}: {
  queueStatus?: QueueStatus | null
  attendanceConfirmed?: boolean
  canConfirmAttendance: boolean
  confirmationWindowStart?: Date | null
  gameStatus: GameStatus
  isLocked?: boolean
  isGrabOnly?: boolean
  spotsLeft: number
}) => {
  if (gameStatus === 'cancelled') return 'This run was cancelled.'
  if (gameStatus === 'completed') return 'This run already wrapped.'
  if (queueStatus === 'rostered') {
    if (attendanceConfirmed) return 'You’re locked in. Drop out only if life or death.'
    if (canConfirmAttendance) return 'Confirm spot now.'
    return 'You’re on the roster.'
  }
  if (queueStatus === 'waitlisted') {
    return isGrabOnly
      ? 'Grab an open spot as soon as one opens.'
      : 'You’re on the waitlist. We’ll ping you if a spot opens.'
  }
  if (isLocked) return 'Join cutoff passed.'
  if (spotsLeft > 0) return 'Spots open—tap to grab one.'
  return 'Join the waitlist and we’ll ping you if a spot opens.'
}
