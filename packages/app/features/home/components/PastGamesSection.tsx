import { Button, Card, Paragraph, SizableText, Spinner, XStack, YStack } from '@my/ui/public'
import { ArrowRight } from '@tamagui/lucide-icons'
import { useLink } from 'solito/link'

import type { GameListItem } from 'app/features/games/types'
import { api } from 'app/utils/api'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useGamesListRealtime } from 'app/utils/useRealtimeSync'

import { ViewAllPastGamesButton } from './ViewAllPastGamesButton'

type PastGamesSectionProps = {
  mode: 'admin' | 'player'
}

export const PastGamesSection = ({ mode }: PastGamesSectionProps) => {
  const { activeCommunityId } = useActiveCommunity()
  const { data, isLoading, error, refetch } = api.games.list.useQuery(
    { scope: 'past', communityId: activeCommunityId ?? '' },
    { enabled: Boolean(activeCommunityId) }
  )
  useGamesListRealtime(Boolean(activeCommunityId), activeCommunityId)
  const games = data ?? []
  const visibleGames = games
  const title = 'Recent games'
  return (
    <YStack gap="$2">
      <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
        <SizableText size="$5" fontWeight="600">
          {title}
        </SizableText>
        {mode === 'admin' && visibleGames.length > 0 ? <ViewAllPastGamesButton /> : null}
      </XStack>
      <Card px="$4" py="$3" bordered $platform-native={{ borderWidth: 0 }}>
        <YStack gap="$2">
          {isLoading ? (
            <XStack ai="center" jc="center" py="$4">
              <Spinner />
            </XStack>
          ) : error ? (
            <YStack gap="$2">
              <Paragraph theme="alt1">Unable to load history.</Paragraph>
              <Button br="$10" size="$3" onPress={() => refetch()}>
                Retry
              </Button>
            </YStack>
          ) : visibleGames.length === 0 ? (
            <Paragraph theme="alt2">No games played yet.</Paragraph>
          ) : (
            <YStack gap="$2">
              {visibleGames.slice(0, 10).map((game, index) => (
                <PastGameRow key={game.id} game={game} index={index} />
              ))}
            </YStack>
          )}
        </YStack>
      </Card>
    </YStack>
  )
}

const PastGameRow = ({ game, index }: { game: GameListItem; index: number }) => {
  const link = useLink({ href: `/games/${game.id}` })
  const kickoff = new Date(game.startTime)
  const timeLabel = kickoff.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <XStack
      ai="center"
      jc="space-between"
      py="$2"
      borderBottomWidth={1}
      borderColor="$color4"
      animation="medium"
      enterStyle={{ opacity: 0, x: -20 }}
      delay={index * 40}
      {...link}
      pressStyle={{ opacity: 0.8 }}
    >
      <YStack gap="$0.5" flex={1}>
        <XStack ai="center" jc="space-between" gap="$2">
          <SizableText fontWeight="600">{timeLabel}</SizableText>
          <ArrowRight size={20} />
        </XStack>
        <XStack ai="center" jc="space-between" gap="$2">
          <Paragraph theme="alt2">{game.locationName ? game.locationName : 'Venue TBD'}</Paragraph>
          <XStack ai="center" gap="$1">
            <Paragraph theme="alt2" size="$2">
              View recap
            </Paragraph>
          </XStack>
        </XStack>
      </YStack>
    </XStack>
  )
}
