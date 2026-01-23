import { StyleSheet, type ScrollViewProps } from 'react-native'
import { Fragment, useMemo, useState, type ReactNode } from 'react'

import {
  Card,
  ConfirmDialog,
  FullscreenSpinner,
  Paragraph,
  ScrollView,
  SizableText,
  Button,
  Separator,
  View,
  XStack,
  YStack,
} from '@my/ui/public'
import { Calendar, HelpCircle } from '@tamagui/lucide-icons'
import { BrandStamp } from 'app/components/BrandStamp'
import { InfoPopup } from 'app/components/InfoPopup'
import { SectionHeading } from 'app/components/SectionHeading'
import { screenContentContainerStyle } from 'app/constants/layout'
import { useBrand } from 'app/provider/brand'
import { api } from 'app/utils/api'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useGamesListRealtime, useStatsRealtime } from 'app/utils/useRealtimeSync'
import { useQueueActions } from 'app/utils/useQueueActions'
import { useUser } from 'app/utils/useUser'

import { GameCard, HeroCard, QuickJoinCard, StatsCard } from './components'
import { useMyStats } from './hooks/useMyStats'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export function HomeScreen({ scrollProps, headerSpacer, topInset }: ScrollHeaderProps = {}) {
  const { user, isLoading, isAdmin } = useUser()
  const { activeCommunityId } = useActiveCommunity()
  const { primaryColor } = useBrand()
  const { stats, isLoading: statsLoading } = useMyStats()
  const gamesQuery = api.games.list.useQuery(
    { scope: 'upcoming', communityId: activeCommunityId ?? '' },
    { enabled: Boolean(activeCommunityId) }
  )
  useGamesListRealtime(Boolean(activeCommunityId), activeCommunityId)
  useStatsRealtime(Boolean(activeCommunityId), activeCommunityId)
  const { join, leave, grabOpenSpot, confirmAttendance, pendingGameId, isPending, isConfirming } =
    useQueueActions()
  const [dropGameId, setDropGameId] = useState<string | null>(null)
  const [myGamesInfoOpen, setMyGamesInfoOpen] = useState(false)
  const [nextGameInfoOpen, setNextGameInfoOpen] = useState(false)

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
  const handleDropRequest = (gameId: string) => setDropGameId(gameId)
  const handleDropConfirm = () => {
    if (!dropGameId) return
    leave(dropGameId)
    setDropGameId(null)
  }

  return (
    <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
      {headerSpacer}
      <YStack gap="$4">
        <YStack gap="$4">
          <HeroCard />
          <StatsCard stats={stats} isLoading={statsLoading} />
        </YStack>
        {draftCardGame ? (
          <QuickJoinCard game={draftCardGame} variant='draft' />
        ) : null}
        <Card bordered bw={1} boc="$color12" br="$5" p={0} overflow="hidden" backgroundColor="$color2">
          <YStack p="$4" gap="$1" borderBottomWidth={1} borderBottomColor="$color12">
            <XStack ai="center" jc="space-between" gap="$2">
              <SectionHeading>My games</SectionHeading>
              <Button
                chromeless
                size="$2"
                p="$1"
                onPress={() => setMyGamesInfoOpen(true)}
                aria-label="My games info"
                pressStyle={{ opacity: 0.7 }}
              >
                <Button.Icon>
                  <HelpCircle size={20} color="$color10" />
                </Button.Icon>
              </Button>
            </XStack>
            <Paragraph theme="alt2">Your upcoming games and roster spots.</Paragraph>
          </YStack>
          <YStack p="$0" gap="$0" backgroundColor="$color1">
            {myUpcomingGames.length ? (
              <YStack>
                {myUpcomingGames.map((game, index) => (
                  <Fragment key={game.id}>
                    <GameCard
                      game={game}
                      onJoin={join}
                      onLeave={handleDropRequest}
                      onGrabOpenSpot={grabOpenSpot}
                      onConfirmAttendance={confirmAttendance}
                      isPending={Boolean(isPending && pendingGameId && game.id === pendingGameId)}
                      isConfirming={isConfirming}
                      variant="list"
                    />
                    {index < myUpcomingGames.length - 1 ? (
                      <Separator bw="$0.5" boc="$color12" />
                    ) : null}
                  </Fragment>
                ))}
              </YStack>
            ) : (
              <MyGamesEmptyState />
            )}
          </YStack>
        </Card>
        {nextAvailableGame ? (
          <Card bordered bw={1} boc="$color12" br="$5" p={0} overflow="hidden" backgroundColor="$color2">
            <YStack p="$4" gap="$1" borderBottomWidth={1} borderBottomColor="$color12">
              <XStack ai="center" jc="space-between" gap="$2">
                <SectionHeading>Next available game</SectionHeading>
                <Button
                  chromeless
                  size="$2"
                  p="$1"
                  onPress={() => setNextGameInfoOpen(true)}
                  aria-label="Next available game info"
                  pressStyle={{ opacity: 0.7 }}
                >
                  <Button.Icon>
                    <HelpCircle size={20} color="$color10" />
                  </Button.Icon>
                </Button>
              </XStack>
              <Paragraph theme="alt2">First open spot across the community.</Paragraph>
            </YStack>
            <YStack p="$0" gap="$0" backgroundColor="$color1">
              <QuickJoinCard
                game={nextAvailableGame}
                onJoin={join}
                onLeave={handleDropRequest}
                onGrabOpenSpot={grabOpenSpot}
                onConfirmAttendance={confirmAttendance}
                isPending={isPending}
                pendingGameId={pendingGameId}
                isConfirming={isConfirming}
                gameCardVariant="list"
              />
            </YStack>
          </Card>
        ) : null}
        <BrandStamp />
      </YStack>
      <InfoPopup
        open={myGamesInfoOpen}
        onOpenChange={setMyGamesInfoOpen}
        title="My games"
        description="A quick view of your upcoming games and spots."
        bullets={[
          'Only future games show here.',
          'Rostered and waitlisted games are included.',
          'Tap a game to manage your spot.',
        ]}
        footer="Use Schedule to see all upcoming games."
      />
      <InfoPopup
        open={nextGameInfoOpen}
        onOpenChange={setNextGameInfoOpen}
        title="Next available game"
        description="Here you will see the first open spot you can claim right now."
        bullets={[
          'Only released games with open spots appear here.',
          "If you're already in that game, it won’t show.",
          'Updates as spots open or fill.',
        ]}
        footer="Use Schedule for the full list."
      />
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
    </ScrollView>
  )
}

const MyGamesEmptyState = () => {
  const { primaryColor } = useBrand()

  return (
    <YStack ai="center" jc="center" py="$6" position="relative" overflow="hidden">
      <YStack position="absolute" top={0} left={0} right={0} bottom={0} opacity={0.2} gap="$3">
        {[0, 1].map((row) => (
          <YStack
            key={`ghost-game-${row}`}
            h={72}
            br="$4"
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
        gap="$2"
        alignItems="center"
        maxWidth={280}
        width="100%"
      >
        <YStack w={72} h={72} br={999} bg="$color2" ai="center" jc="center">
          <Calendar size={32} color={primaryColor} />
        </YStack>
        <SizableText
          size="$3"
          fontWeight="700"
          textTransform="uppercase"
          letterSpacing={1.2}
          textAlign="center"
        >
          No upcoming games yet
        </SizableText>
        <Paragraph theme="alt2" textAlign="center">
          Your next run awaits. Join the next game with the crew.
        </Paragraph>
      </Card>
    </YStack>
  )
}
