import { ScrollView, View, YStack, Card, Paragraph, Spinner, Button } from '@my/ui/public'

import { screenContentContainerStyle } from 'app/constants/layout'
import { api } from 'app/utils/api'
import { useGamesListRealtime } from 'app/utils/useRealtimeSync'
import { useQueueActions } from 'app/utils/useQueueActions'
import type { GameListItem } from 'app/features/games/types'
import { WatermarkLogo } from 'app/components/WatermarkLogo'

import { GameCard } from './components/game-card'

export const ScheduleScreen = () => {
  const { data, isLoading, error, refetch } = api.games.list.useQuery({ scope: 'upcoming' })
  useGamesListRealtime(true)
  const { join, leave, confirmAttendance, pendingGameId, isPending, isConfirming } = useQueueActions()
  const games = ((data ?? []).filter((game) => game.status !== 'completed') as GameListItem[])

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          ...screenContentContainerStyle,
          flexGrow: 1,
          paddingBottom: (screenContentContainerStyle.paddingBottom ?? 0) + 120,
        }}
      >
        <YStack gap="$4" flexGrow={1}>
          <YStack gap="$1" py="$2">
            <Paragraph fontWeight="600" theme="alt1">
              Upcoming runs
            </Paragraph>
            <Paragraph theme="alt2">
              {games.length
                ? `${games.length} open ${games.length === 1 ? 'run' : 'runs'} this week. Tap to join.`
                : 'No open runs yet. Check back after the next drop.'}
            </Paragraph>
          </YStack>
          <GameListSection
            games={games}
            isLoading={isLoading}
            error={Boolean(error)}
            onRetry={refetch}
            join={join}
            leave={leave}
            confirmAttendance={confirmAttendance}
            pendingGameId={pendingGameId}
            isPending={isPending}
            isConfirming={isConfirming}
          />
        </YStack>
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

  return (
    <YStack gap="$4">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          onJoin={join}
          onLeave={leave}
          onConfirmAttendance={confirmAttendance}
          isPending={isPending && pendingGameId === game.id}
          isConfirming={isConfirming}
        />
      ))}
    </YStack>
  )
}
