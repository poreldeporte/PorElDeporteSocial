import { Button, Card, Paragraph, SizableText, XStack, YStack } from '@my/ui/public'
import { useMemo } from 'react'
import { useLink } from 'solito/link'
import { useRouter } from 'solito/router'

import {
  DEFAULT_CONFIRMATION_WINDOW_HOURS,
  DEFAULT_CRUNCH_TIME_ENABLED,
  DEFAULT_CRUNCH_TIME_START_TIME_LOCAL,
} from '@my/config/game'
import { CombinedStatusBadge, StatusNote } from 'app/features/games/components'
import { getGameCtaIcon, type GameCtaState } from 'app/features/games/cta-icons'
import { deriveCombinedStatus, getConfirmCountdownLabel } from 'app/features/games/status-helpers'
import type { GameListItem } from 'app/features/games/types'
import { buildConfirmationWindowStart, buildJoinCutoff, buildZonedTime, formatGameKickoffLabel } from 'app/features/games/time-utils'
import { BRAND_COLORS } from 'app/constants/colors'

const ctaCopy: Record<GameCtaState, string> = {
  claim: 'Claim spot',
  'join-waitlist': 'Join waitlist',
  'grab-open-spot': 'Grab open spot',
  drop: 'Drop',
}

const deriveCtaState = ({
  userStatus,
  rosterFull,
  isGrabOnly,
}: {
  userStatus: GameListItem['userStatus']
  rosterFull: boolean
  isGrabOnly: boolean
}): GameCtaState => {
  if (userStatus === 'rostered') return 'drop'
  if (userStatus === 'waitlisted') return isGrabOnly ? 'grab-open-spot' : 'drop'
  return rosterFull ? 'join-waitlist' : 'claim'
}

type Props = {
  game: GameListItem
  onJoin: (gameId: string) => void
  onLeave: (gameId: string) => void
  onGrabOpenSpot: (gameId: string) => void
  isPending: boolean
  onConfirmAttendance?: (gameId: string) => void
  isConfirming?: boolean
}

export const GameCard = ({
  game,
  onJoin,
  onLeave,
  onGrabOpenSpot,
  isPending,
  onConfirmAttendance,
  isConfirming,
}: Props) => {
  const startDate = useMemo(() => new Date(game.startTime), [game.startTime])
  const now = Date.now()
  const kickoffLabel = useMemo(() => formatGameKickoffLabel(startDate), [startDate])
  const hasStarted = startDate ? now >= startDate.getTime() : false

  const community = game.community
  const confirmationEnabled = game.confirmationEnabled ?? true
  const confirmationWindowHours =
    community?.confirmationWindowHoursBeforeKickoff ?? DEFAULT_CONFIRMATION_WINDOW_HOURS
  const joinCutoffOffsetMinutes = game.joinCutoffOffsetMinutesFromKickoff ?? 0
  const crunchTimeEnabled = community?.crunchTimeEnabled ?? DEFAULT_CRUNCH_TIME_ENABLED
  const crunchTimeStartTimeLocal =
    game.crunchTimeStartTimeLocal ??
    community?.crunchTimeStartTimeLocal ??
    DEFAULT_CRUNCH_TIME_START_TIME_LOCAL
  const communityTimezone =
    community?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'

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

  const rosteredCount = game.rosteredCount ?? 0
  const waitlistedCount = game.waitlistedCount ?? 0
  const rosterFull = rosteredCount >= game.capacity
  const unconfirmedRosterCount = confirmationEnabled
    ? Math.max(rosteredCount - (game.attendanceConfirmedCount ?? 0), 0)
    : 0
  const userAttendanceConfirmed =
    game.userStatus === 'rostered' && (!confirmationEnabled || Boolean(game.attendanceConfirmedAt))
  const isGrabOnly =
    game.status === 'scheduled' && rosterFull && unconfirmedRosterCount > 0 && isCrunchTimeOpen
  const ctaState = deriveCtaState({
    userStatus: game.userStatus,
    rosterFull,
    isGrabOnly,
  })
  const canJoin = game.status === 'scheduled' && !hasStarted && !isLocked
  const router = useRouter()
  const detailHref = `/games/${game.id}`
  const detailLink = useLink({ href: detailHref })
  const canConfirmAttendance =
    confirmationEnabled &&
    game.userStatus === 'rostered' &&
    !game.attendanceConfirmedAt &&
    isConfirmationOpen
  const combinedStatus = deriveCombinedStatus({
    gameStatus: game.status,
    rosteredCount: rosteredCount,
    capacity: game.capacity,
    isLocked,
    userStatus: game.userStatus === 'none' ? undefined : game.userStatus,
    attendanceConfirmed: userAttendanceConfirmed,
    canConfirmAttendance,
  })
  const confirmCountdownLabel = getConfirmCountdownLabel({
    confirmationWindowStart,
    isConfirmationOpen,
    userStatus: game.userStatus,
    attendanceConfirmedAt: game.attendanceConfirmedAt,
    gameStatus: game.status,
    now,
  })
  const displayStatus =
    confirmCountdownLabel && combinedStatus
      ? { ...combinedStatus, label: confirmCountdownLabel }
      : combinedStatus
  const showConfirmCta = canConfirmAttendance
  const spotsLeft = Math.max(game.capacity - rosteredCount, 0)

  const handleCardPress = () => {
    if (detailLink.onPress) {
      detailLink.onPress()
    } else {
      router.push(detailHref)
    }
  }

  const isRateCta = game.status === 'completed'
  const isJoinAction =
    ctaState === 'claim' || ctaState === 'join-waitlist' || ctaState === 'grab-open-spot'
  const canLeave =
    game.status === 'scheduled' && !hasStarted && !isLocked && game.draftStatus !== 'in_progress'
  const ctaTheme = isRateCta ? 'alt2' : isJoinAction || showConfirmCta ? undefined : 'alt2'
  const primaryButtonStyle =
    !isPending && !isRateCta && isJoinAction
      ? {
          backgroundColor: 'transparent',
          borderColor: BRAND_COLORS.primary,
          color: BRAND_COLORS.primary,
        }
      : !isPending && !isRateCta && showConfirmCta
        ? { backgroundColor: BRAND_COLORS.primary, borderColor: BRAND_COLORS.primary }
      : {}
  const ctaLabel = isRateCta
    ? 'Rate the game'
    : showConfirmCta
      ? 'Confirm spot'
      : ctaCopy[ctaState]
  const ctaDisabled =
    isRateCta ||
    isPending ||
    ((ctaState === 'claim' || ctaState === 'join-waitlist') && !canJoin) ||
    (ctaState === 'grab-open-spot' && !isGrabOnly) ||
    (ctaState === 'drop' && !canLeave) ||
    (showConfirmCta && isConfirming)
  const handleCtaPress = () => {
    if (isRateCta) return
    if (showConfirmCta && onConfirmAttendance) {
      onConfirmAttendance(game.id)
      return
    }
    if (ctaState === 'claim' || ctaState === 'join-waitlist') onJoin(game.id)
    else if (ctaState === 'grab-open-spot') onGrabOpenSpot(game.id)
    else onLeave(game.id)
  }
  const primaryIcon = getGameCtaIcon({
    isPending,
    showConfirm: showConfirmCta,
    isRate: isRateCta,
    ctaState,
  })

  return (
    <Card
      bordered $platform-native={{ borderWidth: 0 }}
      br="$5"
      p="$4"
      gap="$4"
      {...detailLink}
      onPress={handleCardPress}
      hoverStyle={{ backgroundColor: '$color2' }}
      pressStyle={{ backgroundColor: '$color3' }}
      animation="slow"
      enterStyle={{ opacity: 0, y: 25 }}
    >
      <YStack gap="$1.5">
        <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
          <SizableText size="$6" fontWeight="600">
            {kickoffLabel}
          </SizableText>
          <CombinedStatusBadge status={displayStatus} />
        </XStack>
        <YStack gap="$0.5">
          <Paragraph theme="alt1" fontWeight="600">
            {game.locationName ?? 'Venue TBD'}
          </Paragraph>
          <Paragraph theme="alt2" size="$2">
            {`${rosteredCount}/${game.capacity} players${waitlistedCount > 0 ? ` • ${waitlistedCount} on waitlist` : ''}`}
          </Paragraph>
        </YStack>
      </YStack>

      <YStack gap="$2">
        {game.status !== 'scheduled' ? <StatusNote status={game.status} /> : null}

        <XStack gap="$2" ai="center">
          <Button
            flex={1}
            size="$3"
            br="$10"
            disabled={ctaDisabled}
            icon={primaryIcon}
            theme={ctaTheme}
            {...primaryButtonStyle}
            onPress={(event) => {
              event?.stopPropagation?.()
              handleCtaPress()
            }}
          >
            {ctaLabel}
          </Button>
          <Button
            flex={1}
            size="$3"
            br="$10"
            theme="alt2"
            {...detailLink}
            onPress={(event: any) => {
              event?.stopPropagation?.()
              detailLink.onPress?.(event)
            }}
          >
            Details
          </Button>
        </XStack>
      </YStack>
    </Card>
  )
}
