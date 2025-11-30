import { FullscreenSpinner, ScrollView, View, YStack } from '@my/ui'
import { api } from 'app/utils/api'
import { useGamesListRealtime, useStatsRealtime } from 'app/utils/useRealtimeSync'
import { useUser } from 'app/utils/useUser'
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

  const myDraftGame = useMemo(() => {
    if (!gamesQuery.data || !user?.id) return null
    return gamesQuery.data.find(
      (game) =>
        game.draftStatus !== 'completed' &&
        (role === 'admin' || game.captainIds?.includes(user.id))
    )
  }, [gamesQuery.data, role, user?.id])

  const liveDraftGame = useMemo(
    () => gamesQuery.data?.find((game) => game.draftStatus === 'in_progress') ?? null,
    [gamesQuery.data]
  )
  const quickJoinGame = useMemo(() => {
    if (!gamesQuery.data || !gamesQuery.data.length) return null
    const scheduled = gamesQuery.data.filter((game) => game.status === 'scheduled')
    if (!scheduled.length) return null
    return scheduled.reduce((closest, current) => {
      if (!closest) return current
      return new Date(current.startTime).getTime() < new Date(closest.startTime).getTime()
        ? current
        : closest
    }, scheduled[0])
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
        <QuickJoinCard game={quickJoinGame} />
        {!quickJoinGame ? (
          <ScheduleTeaserCard
            title="Full schedule"
            description="Browse every drop-in, lock a roster spot, and keep the streak alive."
          />
        ) : null}
        <PastGamesSection mode={role === 'admin' ? 'admin' : 'player'} />
      </YStack>
    </ScrollView>
  )
}
