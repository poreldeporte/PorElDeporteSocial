import { Button, Card, Paragraph, Separator, SizableText, Spinner, XStack, YStack } from '@my/ui'
import { ArrowRight } from '@tamagui/lucide-icons'
import { useMemo } from 'react'
import { useLink } from 'solito/link'
import { useRouter } from 'solito/router'

import { DEFAULT_WAITLIST_LIMIT } from '@my/config/game'
import { StatusBadge, StatusNote } from 'app/features/games/components'
import {
  deriveAvailabilityStatus,
  deriveUserBadge,
  describeAvailability,
  describeUserBadge,
} from 'app/features/games/status-helpers'
import type { GameListItem } from 'app/features/games/types'
import { formatGameKickoffLabel } from 'app/features/games/time-utils'

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
}

export const GameCard = ({ game, onJoin, onLeave, isPending }: Props) => {
  const startDate = useMemo(() => new Date(game.startTime), [game.startTime])
  const kickoffLabel = useMemo(() => formatGameKickoffLabel(startDate), [startDate])
  const ctaState = deriveCtaState(game)
  const waitlistCapacity = game.waitlistCapacity ?? DEFAULT_WAITLIST_LIMIT
  const waitlistFull = game.waitlistedCount >= waitlistCapacity
  const canJoin = game.status === 'scheduled' && !waitlistFull
  const disableButton = isPending || (ctaState === 'join' && !canJoin)
  const router = useRouter()
  const detailHref = `/games/${game.id}`
  const detailLink = useLink({ href: detailHref })
  const availabilityBadge = deriveAvailabilityStatus({
    status: game.status,
    confirmedCount: game.confirmedCount,
    capacity: game.capacity,
    attendanceConfirmedCount: game.attendanceConfirmedCount ?? 0,
    waitlistedCount: game.waitlistedCount ?? 0,
    waitlistCapacity: game.waitlistCapacity ?? DEFAULT_WAITLIST_LIMIT,
  })
  const userBadge = deriveUserBadge({
    queueStatus: game.userStatus === 'none' ? undefined : game.userStatus,
  })
  const ctaTheme = ctaState === 'join' ? undefined : 'alt2'

  const handlePress = () => {
    if (ctaState === 'join') onJoin(game.id)
    else onLeave(game.id)
  }

  const waitlistLabel = `${game.waitlistedCount}`
  const spotsLeft = Math.max(game.capacity - game.confirmedCount, 0)

  const handleCardPress = () => {
    if (detailLink.onPress) {
      detailLink.onPress()
    } else {
      router.push(detailHref)
    }
  }

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
      <YStack gap="$2">
        <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
          <SizableText size="$6" fontWeight="600">
            {kickoffLabel}
          </SizableText>
        </XStack>
        <CombinedGameStatus availability={availabilityBadge} userBadge={userBadge} />
        <XStack gap="$3" flexWrap="wrap">
          <YStack flexBasis="48%" gap="$1">
            <Paragraph theme="alt2" size="$2">
              Location
            </Paragraph>
            <Paragraph fontWeight="600">{game.locationName ?? 'Venue TBD'}</Paragraph>
          </YStack>
          <YStack flexBasis="48%" gap="$1">
            <Paragraph theme="alt2" size="$2">
              Players signed up
            </Paragraph>
            <Paragraph fontWeight="600">
              {`${game.confirmedCount}/${game.capacity}`}
            </Paragraph>
          </YStack>
        </XStack>
        <Paragraph theme="alt2" size="$2">
          {spotsLeft > 0 ? `${spotsLeft} spots open` : 'No spots open'}
        </Paragraph>
      </YStack>

      <Separator />

      <YStack gap="$3">
        {game.status !== 'scheduled' || waitlistFull ? (
          <StatusNote status={game.status} waitlistFull={waitlistFull} />
        ) : null}

        <XStack gap="$2" ai="center">
          <Button
            flex={1}
            size="$3"
            br="$10"
            disabled={disableButton}
            icon={isPending ? <Spinner size="small" /> : undefined}
            theme={ctaTheme}
            onPress={(event) => {
              event?.stopPropagation?.()
              handlePress()
            }}
          >
            {ctaCopy[ctaState]}
          </Button>
          <Button
            size="$3"
            circular
            chromeless
            theme="alt2"
            {...detailLink}
            onPress={(event) => {
              event?.stopPropagation?.()
              detailLink.onPress?.(event)
            }}
          >
            <ArrowRight />
          </Button>
        </XStack>
      </YStack>
    </Card>
  )
}
const CombinedGameStatus = ({
  availability,
  userBadge,
}: {
  availability: ReturnType<typeof deriveAvailabilityStatus> | null
  userBadge: ReturnType<typeof deriveUserBadge> | null
}) => {
  if (!availability && !userBadge) return null
  const tone = availability?.tone ?? userBadge?.tone ?? 'neutral'
  const parts = [describeAvailability(availability), describeUserBadge(userBadge)].filter(Boolean)
  return (
    <XStack>
      <StatusBadge tone={tone} showIcon>
        {parts.join(' · ')}
      </StatusBadge>
    </XStack>
  )
}
