import { useMemo } from 'react'

import { DEFAULT_WAITLIST_LIMIT } from '@my/config/game'
import { formatGameKickoffLabel } from './time-utils'
import type { GameDetail, QueueEntry } from './types'

export type QueueState = {
  pendingGameId: string | null
  isPending: boolean
}

export type GameDetailStateArgs = {
  game?: GameDetail | null
  userId?: string | null
  queueState: QueueState
  now?: number
}

export type GameDetailViewState = ReturnType<typeof computeGameDetailState>

const statusCopy: Record<GameDetail['status'], { label: string; tone: 'default' | 'warning' }> = {
  scheduled: { label: 'Spots open', tone: 'default' },
  locked: { label: 'Awaiting confirmation', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'warning' },
  completed: { label: 'Completed', tone: 'default' },
}

const userStatusCopy: Record<GameDetail['userStatus'], string> = {
  confirmed: 'You are confirmed for this roster.',
  waitlisted: 'You are on the waitlist.',
  cancelled: 'You dropped from this game.',
  none: 'Queue up before it fills.',
}

export const ctaCopy: Record<'join' | 'leave-confirmed' | 'leave-waitlisted', string> = {
  join: 'Claim spot',
  'leave-confirmed': 'Drop out',
  'leave-waitlisted': 'Leave waitlist',
}

export const deriveCtaState = (userStatus: GameDetail['userStatus']) => {
  if (userStatus === 'confirmed') return 'leave-confirmed'
  if (userStatus === 'waitlisted') return 'leave-waitlisted'
  return 'join'
}

const sortConfirmed = (entries: QueueEntry[]) =>
  [...entries].sort((a, b) => {
    if (a.attendanceConfirmedAt && !b.attendanceConfirmedAt) return -1
    if (!a.attendanceConfirmedAt && b.attendanceConfirmedAt) return 1
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  })

export const computeGameDetailState = ({
  game,
  userId,
  queueState,
  now = Date.now(),
}: GameDetailStateArgs) => {
  const startDate = game?.startTime ? new Date(game.startTime) : null
  const formattedStart = startDate
    ? startDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : ''
  const kickoffLabel = formatGameKickoffLabel(startDate)
  const hasStarted = startDate ? now >= startDate.getTime() : false

  const confirmedCount = game?.confirmedCount ?? 0
  const waitlistedCount = game?.waitlistedCount ?? 0
  const waitlistCapacity = game?.waitlistCapacity ?? DEFAULT_WAITLIST_LIMIT
  const waitlistFull = waitlistedCount >= waitlistCapacity
  const spotsLeft = game ? Math.max(game.capacity - confirmedCount, 0) : 0

  const confirmedPlayers = sortConfirmed(
    (game?.queue ?? []).filter((entry) => entry.status === 'confirmed')
  )
  const waitlistedPlayers = (game?.queue ?? [])
    .filter((entry) => entry.status === 'waitlisted')
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())

  const userEntry =
    game && userId ? game.queue.find((entry) => entry.player.id === userId) ?? null : null

  const userStatus = game ? userEntry?.status ?? game.userStatus : 'none'
  const ctaState = deriveCtaState(userStatus)
  const isGamePending = queueState.isPending && game ? queueState.pendingGameId === game.id : false
  const canJoin = !!game && !hasStarted && game.status !== 'cancelled'
  const canLeave =
    !!game &&
    !hasStarted &&
    game.status !== 'completed' &&
    game.status !== 'cancelled'
  const ctaDisabled =
    !game ||
    isGamePending ||
    (ctaState === 'join' && !canJoin) ||
    (ctaState !== 'join' && !canLeave)
  const ctaTheme = ctaState === 'join' ? undefined : 'alt2'
  const statusMeta = game ? statusCopy[game.status] : null
  const userStatusMessage = userStatusCopy[userStatus]

  const confirmationWindowStart = startDate
    ? new Date(startDate.getTime() - 48 * 60 * 60 * 1000)
    : null
  const isConfirmationOpen =
    confirmationWindowStart && startDate
      ? now >= confirmationWindowStart.getTime() && now < startDate.getTime()
      : false
  const canConfirmAttendance =
    userEntry?.status === 'confirmed' && !userEntry.attendanceConfirmedAt && isConfirmationOpen

  return {
    startDate,
    formattedStart,
    kickoffLabel,
    confirmedPlayers,
    waitlistedPlayers,
    confirmedCount,
    waitlistedCount,
    waitlistCapacity,
    waitlistFull,
    spotsLeft,
    statusMeta,
    userEntry,
    userStatusMessage,
    ctaState,
    ctaLabel: (() => {
      if (!game) return ctaCopy[ctaState]
      if (game.status === 'cancelled') return 'Game cancelled'
      if (game.status === 'completed' || hasStarted) return 'Game completed'
      if (game.status === 'locked' && ctaState === 'join') return 'Join waitlist'
      return ctaCopy[ctaState]
    })(),
    ctaDisabled,
    ctaTheme,
    isGamePending,
    canJoin,
    confirmationWindowStart,
    isConfirmationOpen,
    canConfirmAttendance,
  }
}

export const useGameDetailState = (args: GameDetailStateArgs) => {
  const { game, userId, queueState, now } = args
  return useMemo(
    () => computeGameDetailState({ game, userId, queueState, now }),
    [game, userId, queueState.pendingGameId, queueState.isPending, now]
  )
}
