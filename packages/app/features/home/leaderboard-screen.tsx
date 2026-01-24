import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Animated, StyleSheet, type ScrollViewProps } from 'react-native'

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
  useTheme,
} from '@my/ui/public'
import { BrandStamp } from 'app/components/BrandStamp'
import { InfoPopup } from 'app/components/InfoPopup'
import { SectionCard } from 'app/components/SectionCard'
import { screenContentContainerStyle } from 'app/constants/layout'
import { navRoutes } from 'app/navigation/routes'
import { useBrand } from 'app/provider/brand'
import { api, type RouterOutputs } from 'app/utils/api'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useAppRouter } from 'app/utils/useAppRouter'
import { useStatsRealtime } from 'app/utils/useRealtimeSync'
import { useRealtimeEnabled } from 'app/utils/useRealtimeEnabled'
import { useCtaButtonStyles } from 'app/features/games/cta-styles'
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
  const realtimeEnabled = useRealtimeEnabled(Boolean(activeCommunityId))
  useStatsRealtime(realtimeEnabled, activeCommunityId)
  const [sortMetric, setSortMetric] = useState<Metric>('wins')
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const router = useAppRouter()
  const queryMetric =
    sortMetric === 'goal_diff' ? 'goal_diff' : sortMetric === 'wins' ? 'wins' : 'overall'
  const query = api.stats.leaderboard.useQuery(
    { communityId: activeCommunityId ?? '', metric: queryMetric as any },
    { enabled: Boolean(activeCommunityId) }
  )

  const entries = useMemo(
    () => (query.data ?? []).map(normalizeEntry).filter((entry) => (entry.games ?? 0) > 0),
    [query.data]
  )
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

  const isEmpty = sorted.length === 0

  return (
    <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
      {headerSpacer}
      <YStack gap="$4">
        {glowRow.length ? (
          <YStack pt="$2">
            <GlowRow entries={glowRow} />
          </YStack>
        ) : isEmpty ? (
          <YStack pt="$2">
            <GlowRowGhost />
          </YStack>
        ) : null}

        <YStack gap="$2">
          <SectionCard
            title="Leaderboard"
            description="Ranked by wins, losses, GD, and games."
            onInfoPress={() => setInfoOpen(true)}
            infoLabel="Leaderboard info"
            bodyProps={{ p: '$0', gap: '$0', backgroundColor: '$color1' }}
          >
            {sorted.length ? (
              <>
                <Card bordered borderColor="$color12" p={0} gap={0} overflow="hidden" borderWidth={0}>
                  <TableHeader sortMetric={sortMetric} onSort={setSortMetric} />
                </Card>
                <Card bordered borderColor="$color12" p={0} gap={0} overflow="hidden" borderWidth={0}>
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
                </Card>
              </>
            ) : (
              <LeaderboardEmptyState onPressCta={() => router.push(navRoutes.games.href)} />
            )}
          </SectionCard>
        </YStack>
      </YStack>
      <BrandStamp />
      <InfoPopup
        open={infoOpen}
        onOpenChange={setInfoOpen}
        title="Leaderboard"
        description="Leaderboards show how players rank inside this community."
        bullets={[
          'Ranks are based on wins, losses, goal differential, and games played.',
          'You appear after you’ve played your first game.',
          'Sorting changes how the list is ordered.',
        ]}
        footer="Keep playing to climb the ranks."
      />
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

const LeaderboardEmptyState = ({ onPressCta }: { onPressCta: () => void }) => {
  const { primaryColor } = useBrand()
  const ctaButtonStyles = useCtaButtonStyles()
  const shimmer = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.7,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.45,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [shimmer])

  return (
    <YStack position="relative" py="$5" gap="$3">
      <Animated.View style={{ opacity: shimmer }}>
        <YStack gap="$2">
          <Card bordered borderColor="$color12" p={0} gap={0} overflow="hidden" borderWidth={0}>
            <LeaderboardGhostHeader />
          </Card>
          <Card bordered borderColor="$color12" p={0} gap={0} overflow="hidden" borderWidth={0}>
            <YStack gap={0}>
              {[0, 1, 2, 3, 4].map((row) => (
                <LeaderboardGhostRow key={`ghost-row-${row}`} />
              ))}
            </YStack>
          </Card>
        </YStack>
      </Animated.View>
      <YStack
        position="absolute"
        top={0}
        bottom={0}
        left={0}
        right={0}
        ai="center"
        jc="center"
        pointerEvents="box-none"
      >
        <Card
          bordered
          bw={1}
          boc="$color12"
          br="$5"
          p="$4"
          gap="$3"
          alignItems="center"
          maxWidth={320}
          width="100%"
        >
          <YStack w={72} h={72} br={999} bg="$color2" ai="center" jc="center">
            <CrownIcon size={32} color={primaryColor} />
          </YStack>
          <YStack gap="$1" ai="center">
            <SizableText
              size="$3"
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing={1.2}
              textAlign="center"
            >
              Start the leaderboard
            </SizableText>
            <Paragraph theme="alt2" textAlign="center">
              Rankings unlock after your first game.
            </Paragraph>
          </YStack>
          <YStack gap="$1" ai="center" width="100%">
            <Button size="$3" br="$10" onPress={onPressCta} {...ctaButtonStyles.brandSolid}>
              View schedule
            </Button>
            <Paragraph size="$1" color="$color10" textAlign="center">
              Stats appear after your first match.
            </Paragraph>
          </YStack>
        </Card>
      </YStack>
    </YStack>
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

const GhostBar = ({ width, height = 4 }: { width: number; height?: number }) => (
  <YStack
    width={width}
    height={height}
    br={2}
    backgroundColor="$color6"
  />
)

const LeaderboardGhostHeader = () => (
  <XStack
    px="$3"
    py="$3"
    ai="center"
    jc="space-between"
    gap="$2"
    flexWrap="nowrap"
    borderBottomWidth={1}
    borderColor="$color12"
  >
    <GhostBar width={18} height={2} />
    <YStack f={1} pr="$2">
      <GhostBar width={120} height={4} />
    </YStack>
    <XStack ai="center" gap="$1">
      <GhostBar width={columnWidth} height={3} />
      <GhostBar width={columnWidth} height={3} />
      <GhostBar width={columnWidth} height={3} />
      <GhostBar width={columnWidth} height={3} />
    </XStack>
  </XStack>
)

const LeaderboardGhostRow = () => (
  <YStack
    px="$3"
    py="$5"
    borderTopWidth={1}
    borderColor="$color12"
    borderWidth={1}
  >
    <XStack ai="center" gap="$2" jc="space-between">
      <GhostBar width={18} height={2} />
      <YStack f={1} jc="center" pr="$2">
        <GhostBar width={140} height={5} />
      </YStack>
      <XStack ai="center" gap="$1">
        <GhostBar width={columnWidth} height={3} />
        <GhostBar width={columnWidth} height={3} />
        <GhostBar width={columnWidth} height={3} />
        <GhostBar width={columnWidth} height={3} />
      </XStack>
    </XStack>
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

const GlowRowGhost = () => {
  const { primaryColor } = useBrand()
  const theme = useTheme()
  const crownColor = theme.color12?.val ?? primaryColor
  const podiumColors = {
    1: primaryColor,
    2: '#6CACE4',
    3: '#4b5320',
  } as const
  const ghostSlots = [
    { rank: 2, height: 64, width: 88, color: podiumColors[2] },
    { rank: 1, height: 84, width: 96, color: podiumColors[1] },
    { rank: 3, height: 64, width: 88, color: podiumColors[3] },
  ]
  const slotSpacing = 8
  const podiumWidth =
    ghostSlots.reduce((sum, slot) => sum + slot.width, 0) + slotSpacing * (ghostSlots.length - 1)
  return (
    <YStack p="$3" ai="center" jc="center">
      <YStack position="relative" ai="center" width={podiumWidth}>
        <YStack
          position="absolute"
          top={-10}
          width={120}
          height={120}
          br={60}
          backgroundColor={toRgba(primaryColor, 0.08)}
        />
        <YStack
          position="absolute"
          bottom={-6}
          height={2}
          width="100%"
          br={999}
          backgroundColor="$color4"
        />
        <XStack ai="flex-end" jc="center" gap="$2" flexWrap="nowrap" width="100%">
        {ghostSlots.map((slot) => (
          <YStack key={`ghost-slot-${slot.rank}`} ai="center" minWidth={110} gap="$2">
            {slot.rank === 1 ? (
              <CrownIcon size={18} color={crownColor} opacity={0.45} />
            ) : null}
            <GhostPodiumBlock width={slot.width} height={slot.height} color={slot.color} />
            <Paragraph size="$2" color="$color10" fontWeight="700">
              {slot.rank}
            </Paragraph>
          </YStack>
        ))}
        </XStack>
      </YStack>
    </YStack>
  )
}

const GhostPodiumBlock = ({
  width,
  height,
  color,
}: {
  width: number
  height: number
  color: string
}) => (
  <YStack
    width={width}
    height={height}
    br="$5"
    backgroundColor={toRgba(color, 0.12)}
    borderColor={toRgba(color, 0.5)}
    borderWidth={1.5}
  />
)

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
