import type { ReactNode } from 'react'
import { StyleSheet, type ScrollViewProps } from 'react-native'

import { Button, Card, Paragraph, ScrollView, SizableText, Spinner, XStack, YStack } from '@my/ui/public'
import { getDockSpacer } from 'app/constants/dock'
import { BRAND_COLORS } from 'app/constants/colors'
import { screenContentContainerStyle } from 'app/constants/layout'
import { HistoryGameCard } from 'app/features/games/components/HistoryGameCard'
import { api } from 'app/utils/api'
import { useGamesListRealtime } from 'app/utils/useRealtimeSync'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const GameHistoryScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const insets = useSafeAreaInsets()
  const { data, isLoading, error, refetch } = api.games.list.useQuery({ scope: 'past' })
  useGamesListRealtime(true)
  const games = data ?? []
  const dockSpacer = getDockSpacer(insets.bottom)
  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const baseContentStyle = headerSpacer
    ? { ...screenContentContainerStyle, paddingTop: 0 }
    : screenContentContainerStyle
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
  )

  return (
    <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
      {headerSpacer}
      <YStack gap="$4">
        <YStack gap="$2">
          <XStack ai="center" jc="space-between" gap="$3" flexWrap="wrap">
            <YStack gap="$1" flex={1} minWidth={220}>
              <SizableText size="$7" fontWeight="700">
                Game history
              </SizableText>
              <Paragraph theme="alt2">Every run, every recap.</Paragraph>
            </YStack>
          </XStack>
          <YStack h={2} w={56} br={999} bg={BRAND_COLORS.primary} />
        </YStack>
        {isLoading ? (
          <Card px="$4" py="$3" bordered $platform-native={{ borderWidth: 0 }}>
            <XStack ai="center" jc="center" py="$4">
              <Spinner />
            </XStack>
          </Card>
        ) : error ? (
          <Card px="$4" py="$3" bordered $platform-native={{ borderWidth: 0 }}>
            <YStack gap="$2">
              <Paragraph theme="alt1">Unable to load history.</Paragraph>
              <Button br="$10" size="$3" onPress={() => refetch()}>
                Retry
              </Button>
            </YStack>
          </Card>
        ) : games.length === 0 ? (
          <Card px="$4" py="$3" bordered $platform-native={{ borderWidth: 0 }}>
            <Paragraph theme="alt2">No games played yet.</Paragraph>
          </Card>
        ) : (
          <YStack gap="$3">
            {games.map((game) => (
              <HistoryGameCard key={game.id} game={game} />
            ))}
          </YStack>
        )}
      </YStack>
      <YStack h={dockSpacer} />
    </ScrollView>
  )
}
