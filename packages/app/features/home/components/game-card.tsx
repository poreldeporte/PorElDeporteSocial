import { Button, Card, Paragraph, SizableText, XStack, YStack } from '@my/ui/public'
import { useMemo } from 'react'
import { useLink } from 'solito/link'
import { useRouter } from 'solito/router'

import { CONFIRMATION_WINDOW_MS, DEFAULT_WAITLIST_LIMIT } from '@my/config/game'
import { CombinedStatusBadge, StatusNote } from 'app/features/games/components'
import { getGameCtaIcon } from 'app/features/games/cta-icons'
import { deriveCombinedStatus, getConfirmCountdownLabel } from 'app/features/games/status-helpers'
import type { GameListItem } from 'app/features/games/types'
import { formatGameKickoffLabel } from 'app/features/games/time-utils'
import { BRAND_COLORS } from 'app/constants/colors'

type CtaState = 'join' | 'leave-confirmed' | 'leave-waitlisted'

const ctaCopy: Record<CtaState, string> = {
  join: 'Claim spot',
  'leave-confirmed': 'Drop out',
  'leave-waitlisted': 'Leave waitlist',
}

const deriveCtaState = (game: GameListItem): CtaState => {
  if (game.userStatus === 'confirmed') return 'leave-confirmed'
  if (game.userStatus === 'waitlisted') return 'leave-waitlisted'
  return 'join'
}

type Props = {
  game: GameListItem
  onJoin: (gameId: string) => void
  onLeave: (gameId: string) => void
  isPending: boolean
  onConfirmAttendance?: (gameId: string) => void
  isConfirming?: boolean
}

export const GameCard = ({
  game,
  onJoin,
  onLeave,
  isPending,
  onConfirmAttendance,
  isConfirming,
}: Props) => {
  const startDate = useMemo(() => new Date(game.startTime), [game.startTime])
  const now = Date.now()
  const kickoffLabel = useMemo(() => formatGameKickoffLabel(startDate), [startDate])
  const confirmationWindowStart = useMemo(
    () => (startDate ? new Date(startDate.getTime() - CONFIRMATION_WINDOW_MS) : null),
    [startDate]
  )
  const ctaState = deriveCtaState(game)
  const waitlistCapacity = game.waitlistCapacity ?? DEFAULT_WAITLIST_LIMIT
  const hasStarted = startDate ? now >= startDate.getTime() : false
  const isConfirmationOpen =
    confirmationWindowStart && startDate
      ? now >= confirmationWindowStart.getTime() && now < startDate.getTime()
      : false
  const canJoin = game.status !== 'cancelled' && game.status !== 'completed' && !hasStarted
  const router = useRouter()
  const detailHref = `/games/${game.id}`
  const detailLink = useLink({ href: detailHref })
  const canConfirmAttendance =
    game.userStatus === 'confirmed' &&
    !game.attendanceConfirmedAt &&
    isConfirmationOpen
  const combinedStatus = deriveCombinedStatus({
    gameStatus: game.status,
    confirmedCount: game.confirmedCount,
    capacity: game.capacity,
    attendanceConfirmedCount: game.attendanceConfirmedCount ?? 0,
    waitlistedCount: game.waitlistedCount ?? 0,
    waitlistCapacity: game.waitlistCapacity ?? DEFAULT_WAITLIST_LIMIT,
    userStatus: game.userStatus === 'none' ? undefined : game.userStatus,
    attendanceConfirmed: Boolean(game.attendanceConfirmedAt),
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

  const waitlistLabel = `${game.waitlistedCount}`
  const spotsLeft = Math.max(game.capacity - game.confirmedCount, 0)

  const handleCardPress = () => {
    if (detailLink.onPress) {
      detailLink.onPress()
    } else {
      router.push(detailHref)
    }
  }

  const isRateCta = game.status === 'completed'
  const isJoinWaitlist = ctaState === 'join' && spotsLeft === 0
  const ctaTheme = isRateCta
    ? 'alt2'
    : ctaState === 'join' || showConfirmCta
      ? undefined
      : 'alt2'
  const primaryButtonStyle =
    !isPending && !isRateCta && ctaState === 'join'
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
      : isJoinWaitlist
        ? 'Join waitlist'
        : ctaCopy[ctaState]
  const ctaDisabled =
    isRateCta ||
    isPending ||
    (ctaState === 'join' && !canJoin) ||
    (showConfirmCta && isConfirming)
  const handleCtaPress = () => {
    if (isRateCta) return
    if (showConfirmCta && onConfirmAttendance) {
      onConfirmAttendance(game.id)
      return
    }
    if (ctaState === 'join') onJoin(game.id)
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
            {`${game.confirmedCount}/${game.capacity} players${game.waitlistedCount > 0 ? ` • ${game.waitlistedCount}/${game.waitlistCapacity ?? DEFAULT_WAITLIST_LIMIT} on waitlist` : ''}`}
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
