import type { StatusTone } from './components/GameStatus'
import type { GameStatus } from './types'

type AvailabilityState = 'open' | 'waitlist' | 'waitlist_full' | 'locked' | 'cancelled' | 'completed'

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
  waitlistedCount,
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
    return { state: 'open', label: 'Open', tone: 'success' }
  }
  const confirmedAttendanceCount =
    attendanceConfirmedCount !== undefined ? attendanceConfirmedCount : confirmedCount
  if (confirmedAttendanceCount >= capacity) {
    return { state: 'locked', label: 'Locked', tone: 'neutral' }
  }
  const waitlistIsFull =
    typeof waitlistedCount === 'number' &&
    typeof waitlistCapacity === 'number' &&
    waitlistCapacity > 0 &&
    waitlistedCount >= waitlistCapacity
  if (waitlistIsFull) {
    return { state: 'waitlist_full', label: 'Waitlist full', tone: 'warning' }
  }
  return { state: 'waitlist', label: 'Waitlist open', tone: 'warning' }
}

type QueueStatus = 'confirmed' | 'waitlisted' | 'cancelled' | 'none'

export const deriveUserBadge = ({
  queueStatus,
  attendanceConfirmed,
}: {
  queueStatus?: QueueStatus | null
  attendanceConfirmed?: boolean
}): { label: string; tone: StatusTone } | null => {
  if (!queueStatus || queueStatus === 'none') return null
  if (queueStatus === 'confirmed') {
    return attendanceConfirmed
      ? { label: 'Confirmed', tone: 'success' }
      : { label: 'On roster', tone: 'neutral' }
  }
  if (queueStatus === 'waitlisted') return { label: 'On waitlist', tone: 'warning' }
  if (queueStatus === 'cancelled') return { label: 'Dropped', tone: 'neutral' }
  return null
}

export const describeAvailability = (availability?: AvailabilityDescriptor | null) => {
  if (!availability) return null
  switch (availability.state) {
    case 'open':
      return 'Spots open'
    case 'waitlist':
      return 'Waitlist open'
    case 'waitlist_full':
      return 'Waitlist full'
    case 'locked':
      return 'Roster locked'
    case 'cancelled':
      return 'Game cancelled'
    case 'completed':
      return 'Game completed'
    default:
      return availability.label
  }
}

export const describeUserBadge = (badge?: { label: string } | null) => {
  if (!badge) return null
  switch (badge.label) {
    case 'On roster':
      return 'Awaiting confirmation'
    case 'Confirmed':
      return 'You’re locked in'
    case 'On waitlist':
      return 'Waiting'
    case 'Dropped':
      return 'You dropped'
    default:
      return badge.label
  }
}

export const deriveUserStateMessage = ({
  queueStatus,
  attendanceConfirmed,
  waitlistFull,
  canConfirmAttendance,
  confirmationWindowStart,
  gameStatus,
  spotsLeft,
}: {
  queueStatus?: QueueStatus | null
  attendanceConfirmed?: boolean
  waitlistFull: boolean
  canConfirmAttendance: boolean
  confirmationWindowStart?: Date | null
  gameStatus: GameStatus
  spotsLeft: number
}) => {
  if (gameStatus === 'cancelled') return 'This run was cancelled.'
  if (gameStatus === 'completed') return 'This run already wrapped.'
  if (queueStatus === 'confirmed') {
    if (attendanceConfirmed) return 'You’re locked in. Drop out only if needed.'
    if (canConfirmAttendance) return 'Confirm attendance now.'
    return 'You’re on the roster.'
  }
  if (queueStatus === 'waitlisted') return 'You’re on the waitlist. We’ll ping you if a spot opens.'
  if (queueStatus === 'cancelled') return 'You dropped from this game.'
  if (gameStatus === 'locked') return null
  if (spotsLeft > 0) return 'Spots open—tap to grab one.'
  if (!waitlistFull) return 'Join the waitlist and we’ll ping you if a spot opens.'
  return 'Waitlist is full. Keep an eye on notifications.'
}
