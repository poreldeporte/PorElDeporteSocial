import { useState, type ReactNode } from 'react'
import { StyleSheet, type ScrollViewProps } from 'react-native'

import { Calendar } from '@tamagui/lucide-icons'
import {
  Button,
  Card,
  ConfirmDialog,
  Paragraph,
  ScrollView,
  SizableText,
  Spinner,
  View,
  XStack,
  YStack,
} from '@my/ui/public'
import { screenContentContainerStyle } from 'app/constants/layout'
import { api } from 'app/utils/api'
import { useBrand } from 'app/provider/brand'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useAppRouter } from 'app/utils/useAppRouter'
import { useGamesListRealtime } from 'app/utils/useRealtimeSync'
import { useRealtimeEnabled } from 'app/utils/useRealtimeEnabled'
import { useQueueActions } from 'app/utils/useQueueActions'
import type { GameListItem } from 'app/features/games/types'
import { useCtaButtonStyles } from 'app/features/games/cta-styles'
import { WatermarkLogo } from 'app/components/WatermarkLogo'
import { useUser } from 'app/utils/useUser'
import { navRoutes } from 'app/navigation/routes'

import { GameCard } from './components/game-card'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

const TIMELINE = {
  indent: 20,
  lineWidth: 2,
  dotSize: 10,
  dotOffset: 24,
} as const

export const ScheduleScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const { primaryColor } = useBrand()
  const { isAdmin } = useUser()
  const { activeCommunityId } = useActiveCommunity()
  const router = useAppRouter()
  const { data, isLoading, error, refetch } = api.games.list.useQuery(
    { scope: 'upcoming', communityId: activeCommunityId ?? '' },
    { enabled: Boolean(activeCommunityId) }
  )
  const realtimeEnabled = useRealtimeEnabled(Boolean(activeCommunityId))
  useGamesListRealtime(realtimeEnabled, activeCommunityId)
  const { join, leave, grabOpenSpot, confirmAttendance, pendingGameId, isPending, isConfirming } =
    useQueueActions()
  const [dropGameId, setDropGameId] = useState<string | null>(null)
  const games = ((data ?? []).filter((game) => {
    if (game.status === 'completed') return false
    if (isAdmin) return true
    return !(game.releaseAt && !game.releasedAt)
  }) as GameListItem[])
  const openCount = games.filter((game) => {
    const isUnreleased = Boolean(game.releaseAt && !game.releasedAt)
    return game.status === 'scheduled' && !isUnreleased && game.rosteredCount < game.capacity
  }).length
  const openLabel = `${openCount} open`
  const subtitle = games.length ? 'Claim your spot. Tap to join.' : 'No runs yet. Next drop soon.'
  const handleDropRequest = (gameId: string) => setDropGameId(gameId)
  const handleDropConfirm = () => {
    if (!dropGameId) return
    leave(dropGameId)
    setDropGameId(null)
  }

  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const basePaddingBottom = screenContentContainerStyle.paddingBottom ?? 0
  const baseContentStyle = {
    ...screenContentContainerStyle,
    paddingTop: headerSpacer ? 0 : screenContentContainerStyle.paddingTop,
    flexGrow: 1,
    paddingBottom: basePaddingBottom,
  }
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
  )

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
        {headerSpacer}
        <YStack gap="$4" flexGrow={1}>
          <YStack gap="$2">
            <XStack ai="center" jc="space-between" gap="$3" flexWrap="wrap">
              <YStack gap="$1" flex={1} minWidth={220}>
                <SizableText size="$7" fontWeight="700">
                  Games this week
                </SizableText>
                <Paragraph theme="alt2">{subtitle}</Paragraph>
              </YStack>
              <XStack
                px="$2.5"
                py="$1"
                br="$10"
                borderWidth={1}
                borderColor={primaryColor}
                backgroundColor="transparent"
              >
                <Paragraph size="$1" fontWeight="700" color={primaryColor}>
                  {openLabel}
                </Paragraph>
              </XStack>
            </XStack>
            <YStack h={2} w={56} br={999} bg={primaryColor} />
          </YStack>
          <GameListSection
            games={games}
            isLoading={isLoading}
            error={Boolean(error)}
            onRetry={refetch}
            isAdmin={isAdmin}
            onCreate={() => router.push(navRoutes.create.href)}
            join={join}
            leave={handleDropRequest}
            grabOpenSpot={grabOpenSpot}
            confirmAttendance={confirmAttendance}
            pendingGameId={pendingGameId}
            isPending={isPending}
            isConfirming={isConfirming}
          />
        </YStack>
      </ScrollView>
      <WatermarkLogo style={{ bottom: 36, right: 20, pointerEvents: 'none' }} />
      <ConfirmDialog
        open={Boolean(dropGameId)}
        onOpenChange={(open) => {
          if (!open) setDropGameId(null)
        }}
        title="Drop from game?"
        description="Dropping frees your spot."
        confirmLabel="Drop"
        confirmTone="destructive"
        onConfirm={handleDropConfirm}
      />
    </View>
  )
}

const GameListSection = ({
  games,
  isLoading,
  error,
  onRetry,
  isAdmin,
  onCreate,
  join,
  leave,
  grabOpenSpot,
  confirmAttendance,
  pendingGameId,
  isPending,
  isConfirming,
}: {
  games: GameListItem[]
  isLoading: boolean
  error: boolean
  onRetry: () => void
  isAdmin: boolean
  onCreate: () => void
  join: (id: string) => void
  leave: (id: string) => void
  grabOpenSpot: (id: string) => void
  confirmAttendance: (id: string) => void
  pendingGameId: string | null
  isPending: boolean
  isConfirming: boolean
}) => {
  const { primaryColor } = useBrand()
  if (isLoading) {
    return (
      <Card bordered px="$4" py="$6" ai="center" jc="center" $platform-native={{ borderWidth: 0 }}>
        <Spinner />
      </Card>
    )
  }

  if (error) {
    return (
      <Card bordered px="$4" py="$4" gap="$2" $platform-native={{ borderWidth: 0 }}>
        <Paragraph theme="alt1">We couldn’t load the schedule.</Paragraph>
        <Paragraph theme="alt2">Check your connection and try again.</Paragraph>
        <Button size="$3" br="$10" onPress={onRetry}>
          Retry
        </Button>
      </Card>
    )
  }

  if (!games.length) {
    return (
      <ScheduleEmptyState isAdmin={isAdmin} onCreate={onCreate} />
    )
  }

  const lineLeft = (TIMELINE.indent - TIMELINE.lineWidth) / 2

  return (
    <YStack gap="$4" position="relative">
      <YStack
        position="absolute"
        top={0}
        bottom={0}
        left={lineLeft}
        w={TIMELINE.lineWidth}
        bg="$color4"
        br={999}
        pointerEvents="none"
      />
      {games.map((game) => (
        <XStack key={game.id} gap="$0" ai="flex-start">
          <YStack w={TIMELINE.indent} ai="center">
            <YStack
              mt={TIMELINE.dotOffset}
              w={TIMELINE.dotSize}
              h={TIMELINE.dotSize}
              br={999}
              bg={primaryColor}
              pointerEvents="none"
            />
          </YStack>
          <YStack f={1}>
            <GameCard
              game={game}
              onJoin={join}
              onLeave={leave}
              onGrabOpenSpot={grabOpenSpot}
              onConfirmAttendance={confirmAttendance}
              isPending={isPending && pendingGameId === game.id}
              isConfirming={isConfirming}
            />
          </YStack>
        </XStack>
      ))}
    </YStack>
  )
}

const ScheduleEmptyState = ({
  isAdmin,
  onCreate,
}: {
  isAdmin: boolean
  onCreate: () => void
}) => {
  const { primaryColor } = useBrand()
  const ctaButtonStyles = useCtaButtonStyles()
  return (
    <YStack ai="center" jc="center" py="$6" position="relative" overflow="hidden">
      <YStack position="absolute" top={0} left={0} right={0} bottom={0} opacity={0.2} gap="$3">
        {[0, 1].map((row) => (
          <YStack
            key={`ghost-schedule-${row}`}
            h={96}
            br="$5"
            bg="$color2"
            borderWidth={1}
            borderColor="$color12"
          />
        ))}
      </YStack>
      <Card
        bordered
        bw={1}
        boc="$color12"
        br="$5"
        p="$4"
        gap="$3"
        alignItems="center"
        maxWidth={320}
        width="100%"
      >
        <YStack w={72} h={72} br={999} bg="$color2" ai="center" jc="center">
          <Calendar size={32} color={primaryColor} />
        </YStack>
        <YStack gap="$1" ai="center">
          <SizableText
            size="$3"
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing={1.2}
            textAlign="center"
          >
            No games scheduled
          </SizableText>
          <Paragraph theme="alt2" textAlign="center">
            New games will appear here as they’re posted.
          </Paragraph>
        </YStack>
        {isAdmin ? (
          <YStack gap="$1" ai="center" width="100%">
            <Button size="$3" br="$10" onPress={onCreate} {...ctaButtonStyles.brandSolid}>
              Schedule a game
            </Button>
          </YStack>
        ) : null}
      </Card>
    </YStack>
  )
}
