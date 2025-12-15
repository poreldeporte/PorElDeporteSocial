import { Avatar, Button, Card, Paragraph, ScrollView, SizableText, XStack, YStack } from '@my/ui/public'
import { Shield, Share2, Sparkles, Trophy, UserCog } from '@tamagui/lucide-icons'
import { pedLogo } from 'app/assets'
import { screenContentContainerStyle } from 'app/constants/layout'
import type { GameListItem } from 'app/features/games/types'
import { useStatsRealtime } from 'app/utils/useRealtimeSync'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import { api } from 'app/utils/api'
import { SolitoImage } from 'solito/image'
import { useLink } from 'solito/link'
import { useMemo } from 'react'
import { Share } from 'react-native'

import { ProfileDetails } from './profile-details'

type StatSnapshot = {
  games: number
  wins: number
  losses: number
  winRate: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  gamesAsCaptain: number
}

type MetricCardProps = {
  label: string
  value: string
  rankLabel?: string
  isLoading?: boolean
}

export const ProfileScreen = () => {
  const data = useProfileData()

  return (
    <ScrollView contentContainerStyle={screenContentContainerStyle}>
      <YStack maw={900} mx="auto" w="100%" space="$4" py="$4">
        <ProfileHero
          name={data.displayName}
          role={data.role}
          avatarUrl={data.avatarUrl}
          userId={data.userId}
          onEdit={data.onEdit}
          onLogout={data.onLogout}
        />
        <PerformanceSection
          stats={data.stats}
          performance={data.performance}
          recentForm={data.recentForm}
          isLoading={data.isStatsLoading}
        />
        <HistorySection
          games={data.recentGames}
          isLoading={data.isHistoryLoading}
          isError={data.historyError}
          onRetry={data.onHistoryRetry}
          scheduleLink={data.historyLink}
        />
        <ProfileDetails
          firstName={data.profile?.first_name}
          lastName={data.profile?.last_name}
          email={data.profileEmail}
          phone={data.profile?.phone}
          address={data.profile?.address}
          birthDate={data.profile?.birth_date}
          jerseyNumber={data.profile?.jersey_number}
          position={data.profile?.position}
        />
        <BadgeSection role={data.role} stats={data.stats} recentForm={data.recentForm} />
      </YStack>
    </ScrollView>
  )
}

const useProfileData = () => {
  const { profile, avatarUrl, user, displayName, role } = useUser()
  useStatsRealtime(Boolean(user))
  const editLink = useLink({ href: '/profile/edit' })
  const supabase = useSupabase()
  const scheduleLink = useLink({ href: '/games' })
  const leaderboardQuery = api.stats.leaderboard.useQuery()
  const historyQuery = api.games.list.useQuery({ scope: 'past' })

  const leaderboardEntry = useMemo(() => {
    if (!user?.id) return null
    return leaderboardQuery.data?.find((row) => row.profileId === user.id) ?? null
  }, [leaderboardQuery.data, user?.id])

  const stats = useMemo(() => deriveStats(leaderboardEntry), [leaderboardEntry])
  const performance = useMemo(
    () => buildPerformanceMetrics(stats, leaderboardEntry, leaderboardQuery.data),
    [stats, leaderboardEntry, leaderboardQuery.data]
  )
  const recentForm = leaderboardEntry?.recent ?? []
  const recentGames = useMemo(() => {
    const allGames = historyQuery.data ?? []
    const mine = allGames.filter((game) => game.userStatus === 'confirmed')
    return mine.slice(0, 5)
  }, [historyQuery.data])

  return {
    profile,
    avatarUrl,
    displayName: displayName || 'Member',
    role,
    userId: user?.id ?? '',
    onEdit: editLink.onPress,
    onLogout: () => supabase.auth.signOut(),
    stats,
    performance,
    recentForm,
    recentGames,
    isStatsLoading: leaderboardQuery.isLoading,
    isHistoryLoading: historyQuery.isLoading,
    historyError: Boolean(historyQuery.error),
    onHistoryRetry: historyQuery.refetch,
    historyLink: scheduleLink,
    profileEmail: user?.email ?? null,
  }
}

const ProfileHero = ({
  name,
  role,
  avatarUrl,
  userId,
  onEdit,
  onLogout,
}: {
  name: string
  role: string
  avatarUrl: string
  userId: string
  onEdit?: () => void
  onLogout?: () => void
}) => {
  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} p="$4" gap="$3" borderStyle="solid" borderColor="$color5">
      <XStack gap="$3" ai="center">
        <SolitoImage src={pedLogo} alt="Por El Deporte crest" width={72} height={72} />
        <YStack gap="$1" flex={1}>
          <XStack gap="$1" ai="center">
            <SizableText size="$6" fontWeight="700">
              {name}
            </SizableText>
            <Pill label={formatRole(role)} icon={Shield} />
          </XStack>
        </YStack>
      </XStack>
      <XStack mt="$1" gap="$2" flexWrap="wrap">
        <ActionButton icon={UserCog} label="Edit profile" onPress={onEdit} />
        <ActionButton icon={Shield} label="Log out" onPress={onLogout} theme="alt2" />
      </XStack>
    </Card>
  )
}

const HeroMeta = ({ label, value }: { label: string; value: string }) => (
  <YStack gap="$1">
    <Paragraph theme="alt2" size="$2">
      {label}
    </Paragraph>
    <SizableText fontWeight="600">{value}</SizableText>
  </YStack>
)

const PerformanceSection = ({
  stats,
  performance,
  recentForm,
  isLoading,
}: {
  stats: StatSnapshot
  performance: MetricCardProps[]
  recentForm: string[]
  isLoading: boolean
}) => {
  const summary = isLoading
    ? 'Dialing in your record…'
    : stats.games
    ? `Winning ${formatPercent(stats.winRate)} of ${stats.games} runs`
    : 'You have not played yet — join your first run.'

  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} p="$4" gap="$3">
      <XStack ai="center" jc="space-between" gap="$3" flexWrap="wrap">
        <YStack gap="$1" flex={1}>
          <SizableText size="$5" fontWeight="600">
            Performance
          </SizableText>
          <Paragraph theme="alt2">{summary}</Paragraph>
        </YStack>
        <Pill label={`${stats.wins}-${stats.losses}`} icon={Trophy} tone="active" />
      </XStack>
      <XStack gap="$2" flexWrap="wrap">
        {performance.map((metric) => (
          <MetricCard key={metric.label} {...metric} isLoading={isLoading} />
        ))}
      </XStack>
      <RecentForm recentForm={recentForm} />
    </Card>
  )
}

const HistorySection = ({
  games,
  isLoading,
  isError,
  onRetry,
  scheduleLink,
}: {
  games: GameListItem[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  scheduleLink: ReturnType<typeof useLink>
}) => {
  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} p="$4" gap="$3">
      <XStack ai="center" jc="space-between" flexWrap="wrap" gap="$2">
        <SizableText size="$5" fontWeight="600">
          Recent matches
        </SizableText>
        <Button size="$3" br="$9" theme="alt1" {...scheduleLink}>
          View all matches
        </Button>
      </XStack>
      {isLoading ? (
        <Paragraph theme="alt2">Loading your matches…</Paragraph>
      ) : isError ? (
        <XStack gap="$2" ai="center">
          <Paragraph theme="alt2">Unable to load match history.</Paragraph>
          <Button size="$2" onPress={onRetry}>
            Retry
          </Button>
        </XStack>
      ) : games.length === 0 ? (
        <Paragraph theme="alt2">No games yet — claim your first run.</Paragraph>
      ) : (
        <YStack gap="$2">
          {games.map((game, index) => (
            <HistoryRow key={game.id} game={game} index={index} />
          ))}
        </YStack>
      )}
    </Card>
  )
}

const HistoryRow = ({ game, index }: { game: GameListItem; index: number }) => {
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

const BadgeSection = ({
  role,
  stats,
  recentForm,
}: {
  role: string
  stats: StatSnapshot
  recentForm: string[]
}) => {
  const badges = buildBadges(role, stats, recentForm)
  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} p="$4" gap="$3" backgroundColor="$color2">
      <SizableText size="$5" fontWeight="600">
        Badges
      </SizableText>
      <XStack gap="$2" flexWrap="wrap">
        {badges.map((badge) => (
          <Pill key={badge.label} label={badge.label} icon={badge.icon} tone={badge.tone} />
        ))}
      </XStack>
    </Card>
  )
}

const ActionButton = ({
  icon: Icon,
  label,
  onPress,
  theme,
}: {
  icon: typeof Shield
  label: string
  onPress?: () => void
  theme?: 'alt1' | 'alt2'
}) => (
  <Button
    size="$3"
    br="$8"
    px="$4"
    theme={theme}
    icon={Icon}
    onPress={onPress}
    justifyContent="flex-start"
  >
    {label}
  </Button>
)

const Pill = ({
  label,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string
  icon?: typeof Shield
  tone?: 'neutral' | 'active'
}) => {
  const backgroundColor = tone === 'active' ? '$color9' : '$color3'
  const color = tone === 'active' ? '$color1' : '$color11'
  return (
    <XStack ai="center" gap="$1.5" px="$2.5" py="$1" br="$10" backgroundColor={backgroundColor}>
      {Icon ? <Icon size={14} color={color} /> : null}
      <Paragraph size="$2" color={color} fontWeight="600">
        {label}
      </Paragraph>
    </XStack>
  )
}

const MetricCard = ({ label, value, rankLabel, isLoading }: MetricCardProps) => (
  <YStack
    flexBasis="48%"
    minWidth={140}
    p="$3"
    br="$6"
    borderWidth={1}
    borderColor="$color4"
    backgroundColor="$color1"
    gap="$1"
  >
    <Paragraph theme="alt2" size="$2">
      {label}
    </Paragraph>
    <SizableText size="$6" fontWeight="700">
      {isLoading ? '—' : value}
    </SizableText>
    {rankLabel ? (
      <Paragraph size="$2" theme="alt2">
        {rankLabel}
      </Paragraph>
    ) : null}
  </YStack>
)

const RecentForm = ({ recentForm }: { recentForm: string[] }) => {
  if (!recentForm.length) return null
  return (
    <YStack gap="$1">
      <Paragraph theme="alt2" size="$2">
        Recent form
      </Paragraph>
      <XStack gap="$1.5">
        {recentForm.map((result, index) => (
          <FormChip key={`${result}-${index}`} result={result} />
        ))}
      </XStack>
    </YStack>
  )
}

const FormChip = ({ result }: { result: string }) => {
  const tone = result === 'W' ? '$color9' : '$color5'
  return (
    <YStack
      px="$2"
      py="$1"
      br="$10"
      backgroundColor={tone}
      borderColor="$color4"
      borderWidth={1}
      minWidth={36}
      ai="center"
    >
      <Paragraph fontWeight="700">{result}</Paragraph>
    </YStack>
  )
}

const formatRole = (role: string) => {
  if (role === 'admin') return 'Club steward'
  if (role === 'captain') return 'Captain'
  return 'Member'
}

const formatMemberSince = (date: Date | null) =>
  date
    ? date.toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      })
    : 'Day one'

const formatPercent = (value: number) => `${Math.round((value || 0) * 100)}%`

const shareProfile = async (name: string) => {
  try {
    await Share.share({ message: `${name} · Por El Deporte` })
  } catch {
    // noop
  }
}

const deriveStats = (
  entry: ReturnType<typeof api.stats.leaderboard.useQuery>['data'][number] | null
): StatSnapshot => {
  const games = entry?.games ?? 0
  const wins = entry?.wins ?? 0
  const losses = entry?.losses ?? 0
  const goalsFor = entry?.goalsFor ?? 0
  const goalsAgainst = entry?.goalsAgainst ?? 0
  const goalDiff = entry?.goalDiff ?? goalsFor - goalsAgainst
  const winRate = games ? wins / games : 0
  return {
    games,
    wins,
    losses,
    goalsFor,
    goalsAgainst,
    goalDiff,
    winRate,
    gamesAsCaptain: entry?.gamesAsCaptain ?? 0,
  }
}

const buildPerformanceMetrics = (
  stats: StatSnapshot,
  entry: ReturnType<typeof api.stats.leaderboard.useQuery>['data'][number] | null,
  leaderboard: ReturnType<typeof api.stats.leaderboard.useQuery>['data'] | undefined
) => {
  const communitySize = leaderboard?.length ?? 0
  const rankLabel = (rank?: number | null) => {
    if (!rank || communitySize === 0) return undefined
    const percentile = Math.max(1, Math.round(((communitySize - rank + 1) / communitySize) * 100))
    return `Rank #${rank} · Top ${percentile}%`
  }

  return [
    { label: 'Win rate', value: formatPercent(stats.winRate), rankLabel: rankLabel(entry?.overallRank) },
    { label: 'Games played', value: `${stats.games}`, rankLabel: rankLabel(entry?.overallRank) },
    { label: 'Wins', value: `${stats.wins}`, rankLabel: rankLabel(entry?.winsRank) },
    { label: 'Goal diff', value: `${stats.goalDiff}`, rankLabel: rankLabel(entry?.goalDiffRank) },
    { label: 'Goals for', value: `${stats.goalsFor}` },
    { label: 'Goals against', value: `${stats.goalsAgainst}` },
    { label: 'Captain games', value: `${stats.gamesAsCaptain}`, rankLabel: rankLabel(entry?.captainRank) },
  ].filter(Boolean) as MetricCardProps[]
}

const formatStatus = (status: string) => {
  if (status === 'completed') return 'Completed'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'locked') return 'Locked'
  return 'Scheduled'
}

const buildBadges = (role: string, stats: StatSnapshot, recentForm: string[]) => {
  const winStreak = getWinStreak(recentForm)
  const badges: Array<{ label: string; icon: typeof Shield; tone?: 'active' }> = [
    { label: formatRole(role), icon: Shield, tone: 'active' },
  ]

  if (stats.gamesAsCaptain > 0) {
    badges.push({ label: `Captain x${stats.gamesAsCaptain}`, icon: Shield })
  }
  if (stats.goalDiff > 0) {
    badges.push({ label: `Goal diff +${stats.goalDiff}`, icon: Sparkles })
  }
  if (stats.winRate >= 0.6 && stats.games >= 3) {
    badges.push({ label: `Top form ${formatPercent(stats.winRate)}`, icon: Trophy })
  }
  if (winStreak >= 2) {
    badges.push({ label: `Win streak ${winStreak}`, icon: Sparkles })
  }
  if (badges.length < 3 && stats.games >= 1) {
    badges.push({ label: `${stats.games} games played`, icon: Sparkles })
  }
  return badges
}

const getWinStreak = (recentForm: string[]) => {
  let streak = 0
  for (const result of recentForm) {
    if (result !== 'W') break
    streak += 1
  }
  return streak
}
