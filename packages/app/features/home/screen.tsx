import { StyleSheet, type ScrollViewProps } from 'react-native'
import { useMemo, type ReactNode } from 'react'

import { Card, FullscreenSpinner, Paragraph, ScrollView, SizableText, View, YStack } from '@my/ui/public'
import { screenContentContainerStyle } from 'app/constants/layout'
import { getDockSpacer } from 'app/constants/dock'
import { api } from 'app/utils/api'
import { useGamesListRealtime, useStatsRealtime } from 'app/utils/useRealtimeSync'
import { useQueueActions } from 'app/utils/useQueueActions'
import { useUser } from 'app/utils/useUser'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

import { GameCard, HeroCard, QuickJoinCard, StatsCard } from './components'
import { useMyStats } from './hooks/useMyStats'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export function HomeScreen({ scrollProps, headerSpacer, topInset }: ScrollHeaderProps = {}) {
  const { user, isLoading, isAdmin } = useUser()
  const insets = useSafeAreaInsets()
  const { stats, isLoading: statsLoading } = useMyStats()
  const gamesQuery = api.games.list.useQuery({ scope: 'upcoming' }, { enabled: Boolean(user) })
  useGamesListRealtime(Boolean(user))
  useStatsRealtime(Boolean(user))
  const { join, leave, grabOpenSpot, confirmAttendance, pendingGameId, isPending, isConfirming } =
    useQueueActions()

  const canShowDraft = useMemo(
    () => (game: { draftModeEnabled?: boolean | null; draftVisibility?: string | null }) =>
      isAdmin || (game.draftModeEnabled !== false && game.draftVisibility !== 'admin_only'),
    [isAdmin]
  )

  const myDraftGame = useMemo(() => {
    if (!gamesQuery.data || !user?.id) return null
    return gamesQuery.data.find(
      (game) =>
        game.draftStatus === 'in_progress' &&
        canShowDraft(game) &&
        (isAdmin || game.captainIds?.includes(user.id))
    )
  }, [canShowDraft, gamesQuery.data, isAdmin, user?.id])

  const liveDraftGame = useMemo(
    () =>
      gamesQuery.data?.find(
        (game) => game.draftStatus === 'in_progress' && canShowDraft(game)
      ) ?? null,
    [canShowDraft, gamesQuery.data]
  )
  const { myUpcomingGames, nextAvailableGame } = useMemo(() => {
    const games = gamesQuery.data ?? []
    if (!games.length) return { myUpcomingGames: [], nextAvailableGame: null }
    const now = Date.now()
    const upcoming = games
      .filter((game) => new Date(game.startTime).getTime() > now && game.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    const myUpcoming = upcoming.filter(
      (game) => game.userStatus === 'rostered' || game.userStatus === 'waitlisted'
    )
    const nextAvailable =
      upcoming.find(
        (game) =>
          (!game.releaseAt || game.releasedAt) &&
          game.status === 'scheduled' &&
          game.rosteredCount < game.capacity &&
          (game.userStatus === 'none' || game.userStatus === 'dropped')
      ) ?? null

    return { myUpcomingGames: myUpcoming, nextAvailableGame: nextAvailable }
  }, [gamesQuery.data])

  if (isLoading) {
    return (
      <View flex={1} height={'80vh' as any} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </View>
    )
  }

  if (!user) return null
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

  const draftCardGame = myDraftGame ?? liveDraftGame

  return (
    <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
      {headerSpacer}
      <YStack gap="$4">
        <HeroCard />
        <StatsCard stats={stats} isLoading={statsLoading} />
        {draftCardGame ? (
          <QuickJoinCard game={draftCardGame} variant='draft' />
        ) : null}
        <YStack gap="$2">
          <SizableText size="$5" fontWeight="600">
            My games
          </SizableText>
          {myUpcomingGames.length ? (
            <YStack gap="$3">
              {myUpcomingGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onJoin={join}
                  onLeave={leave}
                  onGrabOpenSpot={grabOpenSpot}
                  onConfirmAttendance={confirmAttendance}
                  isPending={Boolean(isPending && pendingGameId && game.id === pendingGameId)}
                  isConfirming={isConfirming}
                />
              ))}
            </YStack>
          ) : (
            <MyGamesEmptyCard />
          )}
        </YStack>
        {nextAvailableGame ? (
          <QuickJoinCard
            game={nextAvailableGame}
            titleOverride="Next available kickoff"
            onJoin={join}
            onLeave={leave}
            onGrabOpenSpot={grabOpenSpot}
            onConfirmAttendance={confirmAttendance}
            isPending={isPending}
            pendingGameId={pendingGameId}
            isConfirming={isConfirming}
          />
        ) : null}
      </YStack>
      <YStack h={dockSpacer} />
    </ScrollView>
  )
}

const MyGamesEmptyCard = () => {
  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} br="$5" p="$4" gap="$3">
      <YStack gap="$1.5">
      <SizableText size="$6" fontWeight="600">
        No upcoming games yet.
      </SizableText>
      <Paragraph theme="alt2">
        Your next run awaits. Join the next game with the crew.
      </Paragraph>
      </YStack>
    </Card>
  )
}
