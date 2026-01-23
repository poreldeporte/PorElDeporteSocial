import { useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, type ScrollViewProps } from 'react-native'

import { Crown as CrownIcon } from '@tamagui/lucide-icons'
import {
  Button,
  Card,
  FullscreenSpinner,
  Paragraph,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from '@my/ui/public'
import { BrandStamp } from 'app/components/BrandStamp'
import { screenContentContainerStyle } from 'app/constants/layout'
import { useBrand } from 'app/provider/brand'
import { api, type RouterOutputs } from 'app/utils/api'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useStatsRealtime } from 'app/utils/useRealtimeSync'
import { LeaderboardPlayerSheet } from './components/LeaderboardPlayerSheet'

type Metric = 'wins' | 'losses' | 'goal_diff' | 'games'
type RawEntry = RouterOutputs['stats']['leaderboard'][number]
type Entry = RawEntry & { rank: number; winRate: number; recent: string[] }

const normalizeEntry = (entry: RawEntry): Entry => ({
  ...entry,
  rank: entry.rank ?? 0,
  winRate: entry.winRate ?? (entry.games ? entry.wins / entry.games : 0),
  recent: entry.recent ?? [],
})

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const LeaderboardScreen = ({ scrollProps, headerSpacer, topInset }: ScrollHeaderProps = {}) => {
  const { activeCommunityId } = useActiveCommunity()
  useStatsRealtime(Boolean(activeCommunityId), activeCommunityId)
  const [sortMetric, setSortMetric] = useState<Metric>('wins')
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const queryMetric =
    sortMetric === 'goal_diff' ? 'goal_diff' : sortMetric === 'wins' ? 'wins' : 'overall'
  const query = api.stats.leaderboard.useQuery(
    { communityId: activeCommunityId ?? '', metric: queryMetric as any },
    { enabled: Boolean(activeCommunityId) }
  )

  const entries = useMemo(() => (query.data ?? []).map(normalizeEntry), [query.data])
  const sorted = useMemo(() => {
    const list = [...entries]
    list.sort((a, b) => {
      switch (sortMetric) {
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
  }, [entries, sortMetric])
  const glowRow = useMemo(() => sorted.slice(0, 3), [sorted])
  const selectedProfileId = selectedEntry?.profileId ?? null
  const sheetEntry = useMemo(() => {
    if (!selectedProfileId) return selectedEntry
    return sorted.find((entry) => entry.profileId === selectedProfileId) ?? selectedEntry
  }, [selectedEntry, selectedProfileId, sorted])

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

        <YStack gap="$2">
          {sorted.length ? (
            <Card bordered borderColor="$color12" p={0} gap={0} overflow="hidden">
              <TableHeader sortMetric={sortMetric} onSort={setSortMetric} />
            </Card>
          ) : null}
          <Card bordered borderColor="$color12" p={0} gap={0} overflow="hidden">
            {sorted.length === 0 ? (
              <Paragraph theme="alt2" px="$3" py="$3">
                No players to rank yet.
              </Paragraph>
            ) : (
              <YStack gap={0}>
                {sorted.map((entry, index) => (
                <YStack
                  key={entry.profileId ?? index}
                  px="$3"
                  py="$3"
                  borderTopWidth={index === 0 ? 0 : 1}
                  borderColor="$color12"
                  borderWidth={1}
                  transform={[{ scale: 0.97 }]}
                  pressStyle={{ backgroundColor: '$color2' }}
                  animation="100ms"
                  overflow="visible"
                  onPress={() => setSelectedEntry(entry)}
                >
                    <LeaderboardRow rank={index + 1} entry={entry} />
                  </YStack>
                ))}
              </YStack>
            )}
          </Card>
        </YStack>
      </YStack>
      <BrandStamp />
      <LeaderboardPlayerSheet
        open={Boolean(sheetEntry)}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null)
        }}
        entry={sheetEntry}
        communitySize={entries.length}
        communityId={activeCommunityId}
      />
    </ScrollView>
  )
}

const LeaderboardRow = ({ rank, entry }: { rank: number; entry: Entry }) => {
  const displayName = entry.name ?? 'Member'

  return (
    <XStack ai="center" gap="$2" jc="space-between">
      <Paragraph theme="alt2" minWidth={24}>
        {rank}.
      </Paragraph>
      <YStack f={1} jc="center" pr="$2" minWidth={0}>
        <SizableText fontWeight="600" numberOfLines={1} minWidth={0}>
          {displayName}
        </SizableText>
      </YStack>
      <XStack ai="center" gap="$1">
        <Column value={`${entry.wins}`} />
        <Column value={`${entry.losses}`} />
        <Column value={`${entry.goalDiff}`} />
        <Column value={`${entry.games}`} />
      </XStack>
    </XStack>
  )
}

const Column = ({ value }: { value: string }) => (
  <YStack minWidth={columnWidth} ai="flex-end" gap="$0.1">
    <Paragraph fontWeight="700" size="$2" ta="right">
      {value}
    </Paragraph>
  </YStack>
)

const TableHeader = ({
  sortMetric,
  onSort,
}: {
  sortMetric: Metric
  onSort: (metric: Metric) => void
}) => (
  <XStack
    px="$3"
    py="$3"
    ai="center"
    jc="space-between"
    gap="$2"
    flexWrap="nowrap"
    borderBottomWidth={1}
    borderColor="$color12"
    transform={[{ scale: 0.97 }]}
  >
    <Paragraph fontWeight="700" size="$2" minWidth={24} theme="alt2">
      {' '}
    </Paragraph>
    <Paragraph fontWeight="700" size="$2" flex={1} pr="$2">
      Player
    </Paragraph>
    <XStack ai="center" gap="$1">
      <HeaderColumn label="W" metric="wins" isActive={sortMetric === 'wins'} onPress={onSort} />
      <HeaderColumn label="L" metric="losses" isActive={sortMetric === 'losses'} onPress={onSort} />
      <HeaderColumn label="GD" metric="goal_diff" isActive={sortMetric === 'goal_diff'} onPress={onSort} />
      <HeaderColumn label="GP" metric="games" isActive={sortMetric === 'games'} onPress={onSort} />
    </XStack>
  </XStack>
)

const columnWidth = 36

const HeaderColumn = ({
  label,
  metric,
  isActive,
  onPress,
}: {
  label: string
  metric: Metric
  isActive: boolean
  onPress: (metric: Metric) => void
}) => {
  const { primaryColor } = useBrand()
  return (
    <XStack
      minWidth={columnWidth}
      ai="center"
      jc="flex-end"
      cursor="pointer"
      pressStyle={{ opacity: 0.6 }}
      onPress={() => onPress(metric)}
      accessibilityRole="button"
    >
      <Paragraph
        fontWeight="700"
        size="$2"
        ta="right"
        color={isActive ? '$color12' : '$color10'}
        {...(isActive ? { textDecorationLine: 'underline', textDecorationColor: primaryColor } : {})}
      >
        {label}
      </Paragraph>
    </XStack>
  )
}

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
  const { primaryColor } = useBrand()
  const podiumColors = {
    1: primaryColor,
    2: '#6CACE4',
    3: '#4b5320',
  } as const
  const slots = [
    { rank: 2, entry: entries[1], glow: podiumColors[2], scale: 0.9, trend: 'up' as const },
    { rank: 1, entry: entries[0], glow: podiumColors[1], scale: 1.5, crown: true },
    { rank: 3, entry: entries[2], glow: podiumColors[3], scale: 0.9, trend: 'down' as const },
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
                    backgroundColor={toRgba(primaryColor, 0.08)}
                    shadowColor={primaryColor}
                    shadowRadius={14}
                  />
                ) : null}
                {slot.crown ? (
                  <YStack position="absolute" top={-18}>
                    <CrownIcon size={20} color={primaryColor} />
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

const toRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
