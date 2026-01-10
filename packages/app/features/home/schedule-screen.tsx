import type { ReactNode } from 'react'
import { StyleSheet, type ScrollViewProps } from 'react-native'

import { ScrollView, View, XStack, YStack, Card, Paragraph, Spinner, Button, SizableText } from '@my/ui/public'
import { BRAND_COLORS } from 'app/constants/colors'
import { screenContentContainerStyle } from 'app/constants/layout'
import { getDockSpacer } from 'app/constants/dock'
import { api } from 'app/utils/api'
import { useGamesListRealtime } from 'app/utils/useRealtimeSync'
import { useQueueActions } from 'app/utils/useQueueActions'
import type { GameListItem } from 'app/features/games/types'
import { WatermarkLogo } from 'app/components/WatermarkLogo'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

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
  const insets = useSafeAreaInsets()
  const { data, isLoading, error, refetch } = api.games.list.useQuery({ scope: 'upcoming' })
  useGamesListRealtime(true)
  const { join, leave, grabOpenSpot, confirmAttendance, pendingGameId, isPending, isConfirming } =
    useQueueActions()
  const games = ((data ?? []).filter((game) => game.status !== 'completed') as GameListItem[])
  const openCount = games.filter((game) => game.status === 'scheduled' && game.rosteredCount < game.capacity).length
  const openLabel = `${openCount} open`
  const subtitle = games.length ? 'Claim your spot. Tap to join.' : 'No runs yet. Next drop soon.'

  const dockSpacer = getDockSpacer(insets.bottom)
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
                borderColor={BRAND_COLORS.primary}
                backgroundColor="transparent"
              >
                <Paragraph size="$1" fontWeight="700" color={BRAND_COLORS.primary}>
                  {openLabel}
                </Paragraph>
              </XStack>
            </XStack>
            <YStack h={2} w={56} br={999} bg={BRAND_COLORS.primary} />
          </YStack>
          <GameListSection
            games={games}
            isLoading={isLoading}
            error={Boolean(error)}
            onRetry={refetch}
            join={join}
            leave={leave}
            grabOpenSpot={grabOpenSpot}
            confirmAttendance={confirmAttendance}
            pendingGameId={pendingGameId}
            isPending={isPending}
            isConfirming={isConfirming}
          />
        </YStack>
        <YStack h={dockSpacer} />
      </ScrollView>
      <WatermarkLogo style={{ bottom: 36, right: 20, pointerEvents: 'none' }} />
    </View>
  )
}

const GameListSection = ({
  games,
  isLoading,
  error,
  onRetry,
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
  join: (id: string) => void
  leave: (id: string) => void
  grabOpenSpot: (id: string) => void
  confirmAttendance: (id: string) => void
  pendingGameId: string | null
  isPending: boolean
  isConfirming: boolean
}) => {
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
      <Card bordered px="$4" py="$4" $platform-native={{ borderWidth: 0 }}>
        <Paragraph theme="alt1">No games scheduled yet. Check back soon.</Paragraph>
      </Card>
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
              bg={BRAND_COLORS.primary}
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
