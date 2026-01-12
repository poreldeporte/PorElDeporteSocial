import { useMemo } from 'react'

import {
  DEFAULT_CONFIRMATION_WINDOW_HOURS,
  DEFAULT_COMMUNITY_PRIORITY_ENABLED,
  DEFAULT_CRUNCH_TIME_ENABLED,
  DEFAULT_CRUNCH_TIME_START_TIME_LOCAL,
} from '@my/config/game'
import { buildConfirmationWindowStart, buildJoinCutoff, buildZonedTime, formatGameKickoffLabel } from './time-utils'
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
  cancelled: { label: 'Cancelled', tone: 'warning' },
  completed: { label: 'Completed', tone: 'default' },
}

const userStatusCopy: Record<GameDetail['userStatus'], string> = {
  rostered: 'You are rostered for this game.',
  waitlisted: 'You are on the waitlist.',
  dropped: 'You dropped from this game.',
  none: 'Claim a spot before it fills.',
}

export const ctaCopy: Record<'claim' | 'join-waitlist' | 'grab-open-spot' | 'drop', string> = {
  claim: 'Claim spot',
  'join-waitlist': 'Join waitlist',
  'grab-open-spot': 'Grab open spot',
  drop: 'Drop',
}

export const deriveCtaState = ({
  userStatus,
  rosterFull,
  isGrabOnly,
}: {
  userStatus: GameDetail['userStatus']
  rosterFull: boolean
  isGrabOnly: boolean
}) => {
  if (userStatus === 'rostered') return 'drop'
  if (userStatus === 'waitlisted') return isGrabOnly ? 'grab-open-spot' : 'drop'
  return rosterFull ? 'join-waitlist' : 'claim'
}

const sortQueue = (entries: QueueEntry[], priorityEnabled: boolean) =>
  [...entries].sort((a, b) => {
    if (priorityEnabled) {
      const guestA = a.isGuest ? 1 : 0
      const guestB = b.isGuest ? 1 : 0
      if (guestA !== guestB) return guestA - guestB
    }
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
  const releaseAt = game?.releaseAt ? new Date(game.releaseAt) : null
  const releaseLabel = formatGameKickoffLabel(releaseAt)
  const isUnreleased = Boolean(game?.releaseAt && !game?.releasedAt)
  const hasStarted = startDate ? now >= startDate.getTime() : false

  const community = game?.community ?? null
  const confirmationEnabled = game?.confirmationEnabled ?? true
  const confirmationWindowHours =
    community?.confirmationWindowHoursBeforeKickoff ?? DEFAULT_CONFIRMATION_WINDOW_HOURS
  const joinCutoffOffsetMinutes = game?.joinCutoffOffsetMinutesFromKickoff ?? 0
  const crunchTimeEnabled = community?.crunchTimeEnabled ?? DEFAULT_CRUNCH_TIME_ENABLED
  const crunchTimeStartTimeLocal =
    game?.crunchTimeStartTimeLocal ??
    community?.crunchTimeStartTimeLocal ??
    DEFAULT_CRUNCH_TIME_START_TIME_LOCAL
  const communityTimezone =
    community?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
  const communityPriorityEnabled =
    community?.communityPriorityEnabled ?? DEFAULT_COMMUNITY_PRIORITY_ENABLED

  const joinCutoff = startDate ? buildJoinCutoff(startDate, joinCutoffOffsetMinutes) : null
  const isLocked = joinCutoff ? now >= joinCutoff.getTime() : false

  const confirmationWindowStart =
    startDate && confirmationEnabled
      ? buildConfirmationWindowStart(startDate, confirmationWindowHours)
      : null
  const confirmationWindowConfigured =
    Boolean(confirmationWindowStart && joinCutoff && joinCutoff > confirmationWindowStart)
  const isConfirmationOpen =
    confirmationWindowConfigured && confirmationWindowStart && joinCutoff
      ? now >= confirmationWindowStart.getTime() && now < joinCutoff.getTime()
      : false

  const crunchTimeStartCandidate =
    startDate && confirmationWindowConfigured && confirmationEnabled && crunchTimeEnabled && joinCutoff
      ? buildZonedTime({
          startTime: startDate,
          timeZone: communityTimezone,
          timeLocal: crunchTimeStartTimeLocal,
        })
      : null
  const crunchTimeStart =
    crunchTimeStartCandidate && joinCutoff && crunchTimeStartCandidate < joinCutoff
      ? crunchTimeStartCandidate
      : null
  const isCrunchTimeOpen =
    crunchTimeStart && joinCutoff ? now >= crunchTimeStart.getTime() && now < joinCutoff.getTime() : false

  const rosteredPlayers = sortQueue(
    (game?.queue ?? []).filter((entry) => entry.status === 'rostered'),
    communityPriorityEnabled
  )
  const waitlistedPlayers = sortQueue(
    (game?.queue ?? []).filter((entry) => entry.status === 'waitlisted'),
    communityPriorityEnabled
  )
  const rosteredCount = game?.rosteredCount ?? rosteredPlayers.length
  const waitlistedCount = game?.waitlistedCount ?? waitlistedPlayers.length
  const spotsLeft = game ? Math.max(game.capacity - rosteredCount, 0) : 0
  const rosterFull = Boolean(game && rosteredCount >= game.capacity)
  const unconfirmedRosterCount = confirmationEnabled
    ? rosteredPlayers.filter((entry) => !entry.attendanceConfirmedAt).length
    : 0

  const userEntry = game && userId ? game.queue.find((entry) => entry.profileId === userId) ?? null : null

  const userStatus = game ? userEntry?.status ?? game.userStatus : 'none'
  const hasReview = Boolean(game?.hasReview)
  const ratingWindow = Boolean(game && game.status === 'completed')
  const canRate = Boolean(game && userStatus === 'rostered' && ratingWindow && !hasReview)
  const isGrabOnly =
    Boolean(
      game &&
        !isUnreleased &&
        game.status === 'scheduled' &&
        rosterFull &&
        unconfirmedRosterCount > 0 &&
        isCrunchTimeOpen
    )
  const ctaState = deriveCtaState({ userStatus, rosterFull, isGrabOnly })
  const isGamePending = queueState.isPending && game ? queueState.pendingGameId === game.id : false
  const canJoin = !!game && !isUnreleased && !hasStarted && game.status === 'scheduled' && !isLocked
  const canLeave =
    !!game &&
    !isUnreleased &&
    !hasStarted &&
    game.status === 'scheduled' &&
    !isLocked &&
    game.draftStatus !== 'in_progress'
  const baseCtaDisabled =
    !game ||
    isGamePending ||
    ((ctaState === 'claim' || ctaState === 'join-waitlist') && !canJoin) ||
    (ctaState === 'grab-open-spot' && !isGrabOnly) ||
    (ctaState === 'drop' && !canLeave)
  const ctaDisabled = ratingWindow ? isGamePending || !canRate : isUnreleased || baseCtaDisabled
  const ctaTheme = ratingWindow ? undefined : ctaState === 'drop' ? 'alt2' : undefined
  const statusMeta = game ? statusCopy[game.status] : null
  const userStatusMessage = isUnreleased && releaseLabel
    ? `Releases ${releaseLabel}.`
    : userStatusCopy[userStatus]

  const canConfirmAttendance =
    confirmationEnabled &&
    !isUnreleased &&
    userEntry?.status === 'rostered' &&
    !userEntry.attendanceConfirmedAt &&
    isConfirmationOpen

  return {
    startDate,
    formattedStart,
    kickoffLabel,
    releaseLabel,
    isUnreleased,
    rosteredPlayers,
    waitlistedPlayers,
    rosteredCount,
    waitlistedCount,
    spotsLeft,
    statusMeta,
    userEntry,
    userStatusMessage,
    ctaState,
    ctaLabel: (() => {
      if (!game) return ctaCopy[ctaState]
      if (isUnreleased && releaseLabel) return `Releases ${releaseLabel}`
      if (game.status === 'cancelled') return 'Game cancelled'
      if (ratingWindow) return canRate ? 'Rate the game' : 'Game completed'
      return ctaCopy[ctaState]
    })(),
    ctaDisabled,
    ctaTheme,
    isGamePending,
    canJoin,
    joinCutoff,
    isLocked,
    confirmationWindowStart,
    isConfirmationOpen,
    canConfirmAttendance,
    isGrabOnly,
    crunchTimeStart,
  }
}

export const useGameDetailState = (args: GameDetailStateArgs) => {
  const { game, userId, queueState, now } = args
  return useMemo(
    () => computeGameDetailState({ game, userId, queueState, now }),
    [game, userId, queueState.pendingGameId, queueState.isPending, now]
  )
}
