import { FullscreenSpinner, ScrollView, View, YStack } from '@my/ui/public'
import { api } from 'app/utils/api'
import { useGamesListRealtime, useStatsRealtime } from 'app/utils/useRealtimeSync'
import { useUser } from 'app/utils/useUser'
import { useQueueActions } from 'app/utils/useQueueActions'
import { useMemo } from 'react'

import { HeroCard, PastGamesSection, QuickJoinCard, ScheduleTeaserCard, StatsCard } from './components'
import { useMyStats } from './hooks/useMyStats'
import { screenContentContainerStyle } from 'app/constants/layout'

export function HomeScreen() {
  const { user, isLoading, role } = useUser()
  const { stats, isLoading: statsLoading } = useMyStats()
  const gamesQuery = api.games.list.useQuery({ scope: 'upcoming' }, { enabled: Boolean(user) })
  useGamesListRealtime(Boolean(user))
  useStatsRealtime(Boolean(user))
  const { join, leave, confirmAttendance, pendingGameId, isPending, isConfirming } = useQueueActions()

  const myDraftGame = useMemo(() => {
    if (!gamesQuery.data || !user?.id) return null
    return gamesQuery.data.find(
      (game) =>
        game.draftStatus === 'in_progress' &&
        (role === 'admin' || game.captainIds?.includes(user.id))
    )
  }, [gamesQuery.data, role, user?.id])

  const liveDraftGame = useMemo(
    () => gamesQuery.data?.find((game) => game.draftStatus === 'in_progress') ?? null,
    [gamesQuery.data]
  )
  const { nextKickoffGame, nextAvailableGame } = useMemo(() => {
    const games = gamesQuery.data ?? []
    if (!games.length) return { nextKickoffGame: null, nextAvailableGame: null }
    const now = Date.now()
    const upcoming = games
      .filter((game) => new Date(game.startTime).getTime() > now && game.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    const nextKickoff = upcoming[0] ?? null

    const availableGames = upcoming.filter(
      (game) => game.status === 'scheduled' && game.confirmedCount < game.capacity
    )
    const nextAvailable =
      availableGames.find((game) => (nextKickoff ? game.id !== nextKickoff.id : true)) ?? null

    return { nextKickoffGame: nextKickoff, nextAvailableGame: nextAvailable }
  }, [gamesQuery.data])

  if (isLoading) {
    return (
      <View flex={1} height={'80vh' as any} ai="center" jc="center">
        <FullscreenSpinner />
      </View>
    )
  }

  if (!user) return null

  const draftCardGame = myDraftGame ?? liveDraftGame
  const isMyDraftCard = Boolean(draftCardGame && myDraftGame && draftCardGame.id === myDraftGame.id)

  return (
    <ScrollView contentContainerStyle={screenContentContainerStyle}>
      <YStack gap="$4">
        <HeroCard />
        <StatsCard stats={stats} isLoading={statsLoading} />
        {draftCardGame ? (
          <QuickJoinCard game={draftCardGame} variant='draft' />
        ) : null}
        {nextKickoffGame ? (
          <QuickJoinCard
            game={nextKickoffGame}
            titleOverride="Next kickoff"
            onJoin={join}
            onLeave={leave}
            onConfirmAttendance={confirmAttendance}
            isPending={isPending}
            pendingGameId={pendingGameId}
            isConfirming={isConfirming}
          />
        ) : null}
        {nextAvailableGame &&
        !(nextKickoffGame && nextKickoffGame.status === 'scheduled' && nextKickoffGame.confirmedCount < nextKickoffGame.capacity) ? (
          <QuickJoinCard
            game={nextAvailableGame}
            titleOverride="Next available"
            onJoin={join}
            onLeave={leave}
            onConfirmAttendance={confirmAttendance}
            isPending={isPending}
            pendingGameId={pendingGameId}
            isConfirming={isConfirming}
          />
        ) : null}
        <PastGamesSection mode={role === 'admin' ? 'admin' : 'player'} />
      </YStack>
    </ScrollView>
  )
}
