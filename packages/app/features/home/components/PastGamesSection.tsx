import { Button, Card, Paragraph, SizableText, Spinner, XStack, YStack } from '@my/ui'
import { History } from '@tamagui/lucide-icons'
import { useMemo } from 'react'
import { useLink } from 'solito/link'

import type { GameListItem } from 'app/features/games/types'
import { api } from 'app/utils/api'
import { useGamesListRealtime } from 'app/utils/useRealtimeSync'

import { ViewAllPastGamesButton } from './ViewAllPastGamesButton'

type PastGamesSectionProps = {
  mode: 'admin' | 'player'
}

export const PastGamesSection = ({ mode }: PastGamesSectionProps) => {
  const { data, isLoading, error, refetch } = api.games.list.useQuery({ scope: 'past' })
  useGamesListRealtime(true)
  const games = data ?? []
  const visibleGames = useMemo(
    () => (mode === 'admin' ? games : games.filter((game) => game.userStatus === 'confirmed')),
    [games, mode]
  )
  const title = mode === 'admin' ? 'Recent games' : 'My recent games'
  const description =
    mode === 'admin'
      ? 'Review past matches, report results, or double-check drafts.'
      : 'Respect the crew. Stay sharp, stay ready.'

  return (
    <Card px="$4" py="$4" bordered $platform-native={{ borderWidth: 0 }}>
      <YStack gap="$2">
        <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
          <XStack ai="center" gap="$2">
            <History size={20} />
            <SizableText size="$5" fontWeight="600">
              {title}
            </SizableText>
          </XStack>
          {mode === 'admin' && visibleGames.length > 0 ? <ViewAllPastGamesButton /> : null}
        </XStack>
        {(mode !== 'admin' || visibleGames.length === 0) ? (
          <Paragraph theme="alt2">{description}</Paragraph>
        ) : null}

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
          <Paragraph theme="alt2">
            {mode === 'admin'
              ? 'No previous games yet.'
              : 'You have not played any games yet.'}
          </Paragraph>
        ) : (
          <YStack gap="$2">
            {visibleGames.slice(0, 5).map((game, index) => (
              <PastGameRow key={game.id} game={game} index={index} />
            ))}
          </YStack>
        )}
      </YStack>
    </Card>
  )
}

const PastGameRow = ({ game, index }: { game: GameListItem; index: number }) => {
  const link = useLink({ href: `/games/${game.id}` })
  const kickoff = new Date(game.startTime)
  const timeLabel = kickoff.toLocaleString(undefined, {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  })
  const dateLabel = kickoff.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
    >
      <YStack gap="$0.5">
        <SizableText fontWeight="600">{timeLabel}</SizableText>
        <Paragraph theme="alt2">
          {game.locationName ? `${game.locationName} · ${dateLabel}` : dateLabel}
        </Paragraph>
      </YStack>
      <Button size="$2" br="$10" {...link}>
        Open
      </Button>
    </XStack>
  )
}
