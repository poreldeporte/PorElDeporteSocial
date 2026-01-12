import { StyleSheet, type ScrollViewProps } from 'react-native'
import { useMemo, useState, type ReactNode } from 'react'

import { Crown as CrownIcon } from '@tamagui/lucide-icons'
import {
  Avatar,
  Button,
  Card,
  FullscreenSpinner,
  Paragraph,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from '@my/ui/public'
import { BRAND_COLORS } from 'app/constants/colors'
import { screenContentContainerStyle } from 'app/constants/layout'
import { getDockSpacer } from 'app/constants/dock'
import { api, type RouterOutputs } from 'app/utils/api'
import { useStatsRealtime } from 'app/utils/useRealtimeSync'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { useUser } from 'app/utils/useUser'

type Metric = 'wins' | 'losses' | 'goal_diff' | 'games'
type RawEntry = RouterOutputs['stats']['leaderboard'][number]
type Entry = RawEntry & { rank: number; winRate: number; recent: string[] }

const metricOptions: { id: Metric; label: string }[] = [
  { id: 'wins', label: 'W' },
  { id: 'losses', label: 'L' },
  { id: 'goal_diff', label: 'GD' },
  { id: 'games', label: 'GP' },
]

const formatWinRate = (value: number) => `${Math.round((value || 0) * 100)}%`
const normalizeEntry = (entry: RawEntry): Entry => ({
  ...entry,
  rank: entry.rank ?? 0,
  winRate: entry.winRate ?? (entry.games ? entry.wins / entry.games : 0),
  recent: entry.recent ?? [],
})

const PODIUM_COLORS = {
  1: BRAND_COLORS.primary,
  2: '#6CACE4',
  3: '#4b5320',
} as const

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const LeaderboardScreen = ({ scrollProps, headerSpacer, topInset }: ScrollHeaderProps = {}) => {
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  useStatsRealtime(Boolean(user))
  const [metric, setMetric] = useState<Metric>('wins')
  const queryMetric = metric === 'goal_diff' ? 'goal_diff' : metric === 'wins' ? 'wins' : 'overall'
  const query = api.stats.leaderboard.useQuery({ metric: queryMetric as any })

  const entries = useMemo(() => (query.data ?? []).map(normalizeEntry), [query.data])
  const sorted = useMemo(() => {
    const list = [...entries]
    list.sort((a, b) => {
      switch (metric) {
        case 'wins':
          return (b.wins ?? 0) - (a.wins ?? 0)
        case 'losses':
          return (b.losses ?? 0) - (a.losses ?? 0)
        case 'goal_diff':
          return (b.goalDiff ?? 0) - (a.goalDiff ?? 0)
        case 'games':
          return (b.games ?? 0) - (a.games ?? 0)
        default:
          return (b.winRate ?? 0) - (a.winRate ?? 0)
      }
    })
    return list
  }, [entries, metric])
  const glowRow = useMemo(() => sorted.slice(0, 3), [sorted])

  if (query.isLoading) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (query.error) {
    return (
      <YStack f={1} ai="center" jc="center" gap="$2" pt={topInset ?? 0}>
        <Paragraph theme="alt2">Unable to load leaderboard.</Paragraph>
        <Button onPress={() => query.refetch()}>Retry</Button>
      </YStack>
    )
  }
  const dockSpacer = getDockSpacer(insets.bottom)
  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const basePaddingBottom = screenContentContainerStyle.paddingBottom ?? 0
  const baseContentStyle = headerSpacer
    ? { ...screenContentContainerStyle, paddingTop: 0, paddingBottom: basePaddingBottom }
    : { ...screenContentContainerStyle, paddingBottom: basePaddingBottom }
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
  )

  return (
    <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
      {headerSpacer}
      <YStack gap="$4">
        {glowRow.length ? (
          <YStack pt="$2">
            <GlowRow entries={glowRow} />
          </YStack>
        ) : null}

        <Card bordered $platform-native={{ borderWidth: 0 }} p="$1.5" gap="$1">
          <XStack gap="$1" ai="center" jc="space-between">
            <XStack gap="$1" ai="center" flex={1} flexWrap="wrap">
              {metricOptions.map((option) => (
                <Button
                  key={option.id}
                  size="$2"
                  theme={metric === option.id ? 'active' : 'alt1'}
                  onPress={() => setMetric(option.id)}
                  flex={1}
                >
                  {option.label}
                </Button>
              ))}
            </XStack>
          </XStack>
        </Card>

        <Card bordered $platform-native={{ borderWidth: 0 }} p="$0" gap="$0">
          {sorted.length === 0 ? (
            <Paragraph theme="alt2" px="$3" py="$3">
              No players to rank yet.
            </Paragraph>
        ) : (
          <>
            <TableHeader />
            {sorted.map((entry, index) => (<LeaderboardRow key={entry.profileId ?? index} rank={entry.rank || index + 1} entry={entry} />))}
          </>
        )}
      </Card>
      </YStack>
      <YStack h={dockSpacer} />
    </ScrollView>
  )
}

const LeaderboardRow = ({ rank, entry }: { rank: number; entry: Entry }) => {
  return (
    <XStack
      px="$2"
      py="$1.5"
      ai="center"
      gap="$0.5"
      flexWrap="nowrap"
      borderBottomWidth={1}
      borderColor="$color4"
      backgroundColor="$color1"
    >
      <RankBadge rank={rank} />
      <Paragraph fontWeight="700" size="$2" numberOfLines={1} ellipsizeMode="tail" pl="$1" flex={1}>
        {entry.name}
      </Paragraph>
      <Column value={`${entry.wins}`} />
      <Column value={`${entry.losses}`} />
      <Column value={`${entry.goalDiff}`} />
      <Column value={`${entry.games}`} />
    </XStack>
  )
}

const RankBadge = ({ rank }: { rank: number }) => (
  <YStack width={32} height={32} ai="center" jc="center" br="$10" backgroundColor={rank === 1 ? '$color8' : '$color3'}>
    <Paragraph fontWeight="700" size="$2">
      {rank}
    </Paragraph>
  </YStack>
)

const Column = ({ value }: { value: string }) => (
  <YStack minWidth={52} ai="flex-end" gap="$0.1">
    <Paragraph fontWeight="700" size="$2" ta="right">
      {value}
    </Paragraph>
  </YStack>
)

const TableHeader = () => (
  <XStack px="$2" py="$1.25" ai="center" gap="$0.5" flexWrap="nowrap" borderBottomWidth={1} borderColor="$color4">
    <Paragraph fontWeight="700" size="$2" minWidth={32} ta="center">
      {' '}
    </Paragraph>
    <Paragraph fontWeight="700" size="$2" flex={1} pl="$1">
      Player
    </Paragraph>
    <Paragraph fontWeight="700" size="$2" minWidth={52} ta="right">
      W
    </Paragraph>
    <Paragraph fontWeight="700" size="$2" minWidth={52} ta="right">
      L
    </Paragraph>
    <Paragraph fontWeight="700" size="$2" minWidth={52} ta="right">
      GD
    </Paragraph>
    <Paragraph fontWeight="700" size="$2" minWidth={52} ta="right">
      GP
    </Paragraph>
  </XStack>
)

const initials = (name: string | null | undefined) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts[1]?.[0] ?? ''
  return `${first}${last}`.toUpperCase()
}

const InitialsBadge = ({ name }: { name: string }) => (
  <YStack
    width={72}
    height={72}
    ai="center"
    jc="center"
    br={36}
    backgroundColor="$color2"
    borderColor="$color4"
    borderWidth={1.5}
  >
    <Paragraph color="$color12" fontWeight="700" size="$4">
      {initials(name)}
    </Paragraph>
  </YStack>
)

const GlowRow = ({ entries }: { entries: Entry[] }) => {
  const slots = [
    { rank: 2, entry: entries[1], glow: PODIUM_COLORS[2], scale: 0.9, trend: 'up' as const },
    { rank: 1, entry: entries[0], glow: PODIUM_COLORS[1], scale: 1.5, crown: true },
    { rank: 3, entry: entries[2], glow: PODIUM_COLORS[3], scale: 0.9, trend: 'down' as const },
  ]

  return (
    <YStack p="$3" ai="center" jc="center">
      <XStack ai="center" jc="center" gap="$2" flexWrap="nowrap">
        {slots.map((slot) => {
          const entry = slot.entry
          const name = entry?.name ?? 'TBD'
          return (
            <YStack key={slot.rank} ai="center" gap="$1" minWidth={110}>
              <YStack position="relative" ai="center" jc="center">
                {slot.rank === 1 ? (
                  <YStack
                    position="absolute"
                    top={-20}
                    width={140}
                    height={140}
                    br={70}
                    backgroundColor="rgba(241,95,34,0.08)"
                    shadowColor={BRAND_COLORS.primary}
                    shadowRadius={14}
                  />
                ) : null}
                {slot.crown ? (
                  <YStack position="absolute" top={-18}>
                    <CrownIcon size={20} color={BRAND_COLORS.primary} />
                  </YStack>
                ) : null}
                {slot.rank !== 1 ? (
                  <Paragraph
                    position="absolute"
                    top={-18}
                    color="$color12"
                    fontWeight="800"
                    size="$2"
                  >
                    {slot.rank}
                  </Paragraph>
                ) : null}
                <GlowCircle name={name} glowColor={slot.glow} scale={slot.scale} rank={slot.rank} />
              </YStack>
              <YStack ai="center" mt="$0.5">
                <Paragraph color="$color12" fontWeight="600" numberOfLines={1} ta="center">
                  {name.split(' ')[0] ?? name}
                </Paragraph>
                {name.split(' ')[1] ? (
                  <Paragraph color="$color12" fontWeight="600" numberOfLines={1} ta="center">
                    {name.split(' ').slice(1).join(' ')}
                  </Paragraph>
                ) : null}
              </YStack>
            </YStack>
          )
        })}
      </XStack>
    </YStack>
  )
}

const GlowCircle = ({ name, glowColor, scale = 1, rank }: { name: string; glowColor: string; scale?: number; rank: number }) => {
  const size = 72 * scale
  return (
    <YStack
      width={size}
      height={size}
      ai="center"
      jc="center"
      br={size / 2}
      backgroundColor="$color2"
      borderColor={glowColor}
      borderWidth={2}
      shadowColor={glowColor}
      shadowOpacity={0.25}
      shadowRadius={18}
      overflow="hidden"
      position="relative"
    >
      <Paragraph color="$color12" fontWeight="700" size={rank === 1 ? '$6' : '$4'}>
        {initials(name)}
      </Paragraph>
    </YStack>
  )
}
