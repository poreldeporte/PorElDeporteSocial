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
import { Crown, Trophy } from '@tamagui/lucide-icons'
import { screenContentContainerStyle } from 'app/constants/layout'
import { api, type RouterOutputs } from 'app/utils/api'
import { useMemo, useState } from 'react'

type Metric = 'overall' | 'wins' | 'goal_diff' | 'captain'
type RawEntry = RouterOutputs['stats']['leaderboard'][number]
type Entry = RawEntry & { rank: number; winRate: number; recent: string[] }

const metricOptions: { id: Metric; label: string }[] = [
  { id: 'overall', label: 'Overall' },
  { id: 'wins', label: 'Most wins' },
  { id: 'goal_diff', label: 'Goal diff' },
  { id: 'captain', label: 'Captain' },
]

const formatWinRate = (value: number) => `${Math.round((value || 0) * 100)}%`
const normalizeEntry = (entry: RawEntry): Entry => ({
  ...entry,
  rank: entry.rank ?? 0,
  winRate: entry.winRate ?? (entry.games ? entry.wins / entry.games : 0),
  recent: entry.recent ?? [],
})

export const LeaderboardScreen = () => {
  const [metric, setMetric] = useState<Metric>('overall')
  const query = api.stats.leaderboard.useQuery({ metric })

  const entries = useMemo(() => (query.data ?? []).map(normalizeEntry), [query.data])
  const sorted = entries

  if (query.isLoading) {
    return (
      <YStack f={1} ai="center" jc="center">
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (query.error) {
    return (
      <YStack f={1} ai="center" jc="center" gap="$2">
        <Paragraph theme="alt2">Unable to load leaderboard.</Paragraph>
        <Button onPress={() => query.refetch()}>Retry</Button>
      </YStack>
    )
  }

  const topOverall = entries.find((entry) => entry.overallRank === 1)
  const topGoalDiff = entries.find((entry) => entry.goalDiffRank === 1)
  const topCaptain = entries.find((entry) => entry.captainRank === 1)

  return (
    <ScrollView contentContainerStyle={{ ...screenContentContainerStyle, gap: 16 }}>
      <HighlightRow topOverall={topOverall} topGoalDiff={topGoalDiff} topCaptain={topCaptain} />

      <XStack gap="$2" flexWrap="wrap">
        {metricOptions.map((option) => (
          <Button
            key={option.id}
            size="$3"
            theme={metric === option.id ? 'active' : 'alt1'}
            onPress={() => setMetric(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </XStack>

      <Card bordered $platform-native={{ borderWidth: 0 }} p="$3" gap="$2">
        {sorted.length === 0 ? (
          <Paragraph theme="alt2">No players to rank yet.</Paragraph>
        ) : (
          sorted.map((entry, index) => (
            <LeaderboardRow key={entry.profileId ?? index} rank={entry.rank || index + 1} entry={entry} />
          ))
        )}
      </Card>
    </ScrollView>
  )
}

const HighlightRow = ({
  topOverall,
  topGoalDiff,
  topCaptain,
}: {
  topOverall?: Entry
  topGoalDiff?: Entry
  topCaptain?: Entry
}) => {
  const cards = [
    { label: 'Top overall', entry: topOverall, icon: Trophy, meta: topOverall ? `${formatWinRate(topOverall.winRate)} · ${topOverall.wins}-${topOverall.losses}` : null },
    { label: 'Best goal diff', entry: topGoalDiff, icon: Crown, meta: topGoalDiff ? `GD ${topGoalDiff.goalDiff} · ${topGoalDiff.games} games` : null },
    { label: 'Captain leader', entry: topCaptain, icon: Trophy, meta: topCaptain ? `${topCaptain.gamesAsCaptain} captain games` : null },
  ]
  return (
    <XStack gap="$2" flexWrap="wrap" $gtSm={{ flexWrap: 'nowrap' }}>
      {cards.map(({ label, entry, icon: Icon, meta }, idx) => (
        <Card
          key={label}
          f={1}
          flexBasis={0}
          minWidth={140}
          px="$3"
          py="$2.5"
          bordered
          $platform-native={{ borderWidth: 0 }}
          animation="medium"
          enterStyle={{ opacity: 0, y: 10 }}
          delay={idx * 30}
        >
          <XStack ai="center" gap="$2">
            <Icon size={16} />
            <Paragraph theme="alt2" size="$2">
              {label}
            </Paragraph>
          </XStack>
          {entry ? (
            <>
              <SizableText size="$5" fontWeight="700">
                {entry.name}
              </SizableText>
              {meta ? (
                <Paragraph theme="alt2" size="$2">
                  {meta}
                </Paragraph>
              ) : null}
            </>
          ) : (
            <Paragraph theme="alt2">No data</Paragraph>
          )}
        </Card>
      ))}
    </XStack>
  )
}

const LeaderboardRow = ({ rank, entry }: { rank: number; entry: Entry }) => {
  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} px="$3" py="$2.5" bg="$color1">
      <XStack gap="$2" ai="center" jc="space-between" flexWrap="wrap">
        <XStack gap="$2" ai="center" flexShrink={1}>
          <RankBadge rank={rank} />
          <YStack>
            <SizableText fontWeight="700">{entry.name}</SizableText>
            <Paragraph theme="alt2" size="$2">
              {labelLine(entry)}
            </Paragraph>
          </YStack>
        </XStack>
        <XStack gap="$2" flexWrap="wrap" ai="center">
          <StatPill label="Win rate" value={formatWinRate(entry.winRate)} />
          <StatPill label="Record" value={`${entry.wins}-${entry.losses}`} />
          <StatPill label="GD" value={`${entry.goalDiff}`} />
          <StatPill label="Captain" value={`${entry.gamesAsCaptain}`} />
          <RecentForm recent={entry.recent} />
        </XStack>
      </XStack>
    </Card>
  )
}

const labelLine = (entry: Entry) =>
  [entry.games ? `${entry.games} games` : null, entry.position || null, entry.jerseyNumber ? `#${entry.jerseyNumber}` : null]
    .filter(Boolean)
    .join(' · ')

const RankBadge = ({ rank }: { rank: number }) => (
  <YStack w={32} h={32} ai="center" jc="center" br="$10" backgroundColor={rank === 1 ? '$color8' : '$color3'}>
    <Paragraph fontWeight="700">{rank}</Paragraph>
  </YStack>
)

const StatPill = ({ label, value }: { label: string; value: string }) => (
  <YStack px="$2" py="$1.5" br="$6" borderWidth={1} borderColor="$color4" minWidth={88} ai="center">
    <Paragraph theme="alt2" size="$2">
      {label}
    </Paragraph>
    <Paragraph fontWeight="700">{value}</Paragraph>
  </YStack>
)

const RecentForm = ({ recent }: { recent: string[] }) => {
  if (!recent?.length) return <StatPill label="Form" value="—" />
  return (
    <XStack gap="$1">
      {recent.map((result, idx) => (
        <YStack
          key={`${result}-${idx}`}
          px="$1.5"
          py="$0.5"
          br="$5"
          backgroundColor={result === 'W' ? '$green3' : '$red3'}
        >
          <Paragraph fontWeight="700" size="$2">
            {result}
          </Paragraph>
        </YStack>
      ))}
    </XStack>
  )
}
