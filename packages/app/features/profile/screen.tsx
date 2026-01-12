import { Share, StyleSheet, type ScrollViewProps } from 'react-native'
import { useMemo, type ReactNode } from 'react'
import { Path, Svg } from 'react-native-svg'
import { useLink } from 'solito/link'

import { Button, Card, Paragraph, ScrollView, SizableText, XStack, YStack, useTheme } from '@my/ui/public'
import { ArrowRight, Check, Moon, Settings, Shield, Star, Trophy, Users } from '@tamagui/lucide-icons'
import { BRAND_COLORS } from 'app/constants/colors'
import { screenContentContainerStyle } from 'app/constants/layout'
import { UserAvatar } from 'app/components/UserAvatar'
import type { GameListItem } from 'app/features/games/types'
import { useThemeSetting } from 'app/provider/theme'
import { useLogout } from 'app/utils/auth/logout'
import { useGamesListRealtime, useStatsRealtime } from 'app/utils/useRealtimeSync'
import { useUser } from 'app/utils/useUser'
import { api } from 'app/utils/api'

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

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

type PillTone = 'neutral' | 'active' | 'primary'

export const ProfileScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const data = useProfileData()
  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const baseContentStyle = headerSpacer
    ? { ...screenContentContainerStyle, paddingTop: 0 }
    : screenContentContainerStyle
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
  )

  return (
    <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
      {headerSpacer}
      <YStack maw={900} mx="auto" w="100%" space="$4">
        <ProfileHero
          name={data.displayName}
          avatarUrl={data.avatarUrl}
          userId={data.userId}
          onReviewMembers={data.onReviewMembers}
          onCommunitySettings={data.onCommunitySettings}
          onLogout={data.onLogout}
        />
        <BadgeSection
          role={data.role}
          stats={data.stats}
          attendanceStreak={data.attendanceStreak}
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
          nationality={data.profile?.nationality}
          birthDate={data.profile?.birth_date}
          jerseyNumber={data.profile?.jersey_number}
          position={data.profile?.position}
        />
      </YStack>
    </ScrollView>
  )
}

const useProfileData = () => {
  const { profile, avatarUrl, user, displayName, role, isAdmin } = useUser()
  useStatsRealtime(Boolean(user))
  useGamesListRealtime(Boolean(user))
  const approvalsLink = useLink({ href: '/admin/approvals' })
  const communitySettingsLink = useLink({ href: '/settings/community' })
  const logout = useLogout()
  const historyLink = useLink({ href: '/games/history' })
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
    const mine = allGames.filter((game) => game.userStatus === 'rostered')
    return mine.slice(0, 5)
  }, [historyQuery.data])
  const attendanceStreak = useMemo(
    () => getAttendanceStreak(historyQuery.data ?? []),
    [historyQuery.data]
  )

  return {
    profile,
    avatarUrl,
    displayName: displayName || 'Member',
    role,
    userId: user?.id ?? '',
    onReviewMembers: isAdmin ? approvalsLink.onPress : undefined,
    onCommunitySettings: isAdmin ? communitySettingsLink.onPress : undefined,
    onLogout: () => logout({ userId: user?.id ?? null }),
    stats,
    performance,
    recentForm,
    recentGames,
    attendanceStreak,
    isStatsLoading: leaderboardQuery.isLoading,
    isHistoryLoading: historyQuery.isLoading,
    historyError: Boolean(historyQuery.error),
    onHistoryRetry: historyQuery.refetch,
    historyLink,
    profileEmail: profile?.email ?? user?.email ?? null,
  }
}

const ProfileHero = ({
  name,
  avatarUrl,
  userId,
  onReviewMembers,
  onCommunitySettings,
  onLogout,
}: {
  name: string
  avatarUrl: string | null
  userId: string
  onReviewMembers?: () => void
  onCommunitySettings?: () => void
  onLogout?: () => void
}) => {
  const { set, resolvedTheme } = useThemeSetting()
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light'
  const themeLabel = `Theme: ${theme}`
  const handleThemeToggle = () => {
    set(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} p="$4" gap="$3" borderStyle="solid" borderColor="$color5">
      <XStack gap="$3" ai="center">
        <UserAvatar size={72} name={name} avatarUrl={avatarUrl} />
        <YStack gap="$1" flex={1}>
          <XStack gap="$2" ai="center" jc="space-between">
            <SizableText size="$6" fontWeight="700">
              {name}
            </SizableText>
            {onLogout ? (
              <Button chromeless size="$2" onPress={onLogout}>
                Log out
              </Button>
            ) : null}
          </XStack>
        </YStack>
      </XStack>
      <XStack mt="$1" gap="$2" flexWrap="wrap">
        {onReviewMembers ? (
          <ActionButton icon={Users} label="Review members" onPress={onReviewMembers} />
        ) : null}
        {onCommunitySettings ? (
          <ActionButton icon={Settings} label="Community settings" onPress={onCommunitySettings} />
        ) : null}
        <ActionButton icon={Moon} label={themeLabel} onPress={handleThemeToggle} />
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
      </XStack>
      <YStack gap="$3">
        {[performance.slice(0, 2), performance.slice(2, 5), performance.slice(5, 8)].map((row, rowIndex) => (
          <XStack key={`performance-row-${rowIndex}`} gap="$3">
            {row.map((metric) => (
              <MetricCard key={metric.label} {...metric} isLoading={isLoading} highlight={rowIndex === 0} />
            ))}
          </XStack>
        ))}
      </YStack>
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
          Recent games
        </SizableText>
        <Button size="$3" br="$9" theme="alt1" {...scheduleLink}>
          View all games
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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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
      {...link}
      pressStyle={{ opacity: 0.8 }}
    >
      <YStack gap="$0.5" flex={1}>
        <XStack ai="center" jc="space-between" gap="$2">
          <SizableText fontWeight="600">{timeLabel}</SizableText>
          <ArrowRight size={20} />
        </XStack>
        <XStack ai="center" jc="space-between" gap="$2">
          <Paragraph theme="alt2">{game.locationName ? game.locationName : 'Venue TBD'}</Paragraph>
          <XStack ai="center" gap="$1">
            <Paragraph theme="alt2" size="$2">
              View recap
            </Paragraph>
          </XStack>
        </XStack>
      </YStack>
    </XStack>
  )
}

const BadgeSection = ({
  role,
  stats,
  attendanceStreak,
}: {
  role: string
  stats: StatSnapshot
  attendanceStreak: number
}) => {
  const tierProgress = getTierProgress(stats.games)
  const badges = buildBadges(role, stats, tierProgress.current, attendanceStreak)
  const progressRows = [
    ...tierProgress.progress.map((entry) => ({
      id: entry.tier.id,
      label: entry.tier.label,
      valueLabel: entry.unlocked
        ? 'Unlocked'
        : `${entry.currentCount}/${entry.tier.minGames} games`,
      percent: entry.percent,
    })),
    {
      id: 'ironman',
      label: 'Ironman',
      valueLabel: `${Math.min(attendanceStreak, IRONMAN_STREAK)}/${IRONMAN_STREAK} in a row`,
      percent: Math.min(attendanceStreak / IRONMAN_STREAK, 1),
    },
    {
      id: 'community',
      label: 'Community builder',
      valueLabel: '0/3 referrals',
      percent: 0,
    },
  ]
  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} p="$4" gap="$3" backgroundColor="$color2">
      <SizableText size="$5" fontWeight="600">
        Badges
      </SizableText>
      <Paragraph theme="alt2">Earn badges as you play and contribute to the club.</Paragraph>
      <BadgeProgressList progress={progressRows} />
      <XStack gap="$2" flexWrap="wrap">
        {badges.map((badge) => (
          <BadgeTile key={badge.label} label={badge.label} icon={badge.icon} completed />
        ))}
      </XStack>
    </Card>
  )
}

const BadgeProgressList = ({
  progress,
}: {
  progress: Array<{ id: string; label: string; valueLabel: string; percent: number }>
}) => {
  return (
    <YStack gap="$2">
      {progress.map(({ id, label, valueLabel, percent }) => (
        <YStack key={id} gap="$1">
          <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
            <BadgeStatusPill label={label} completed={percent >= 1} />
            <Paragraph theme="alt2" size="$2">
              {percent >= 1 ? 'Completed' : valueLabel}
            </Paragraph>
          </XStack>
          <YStack h={6} br="$10" backgroundColor="$color3" overflow="hidden">
            <YStack h="100%" w={`${Math.round(percent * 100)}%`} backgroundColor={BRAND_COLORS.primary} />
          </YStack>
        </YStack>
      ))}
    </YStack>
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

const BadgeStatusPill = ({
  label,
  icon: Icon,
  tone = 'neutral',
  completed = false,
}: {
  label: string
  icon?: typeof Shield
  tone?: PillTone
  completed?: boolean
}) => {
  const backgroundColor =
    tone === 'primary' ? BRAND_COLORS.primary : tone === 'active' ? '$color9' : '$color3'
  const color = tone === 'primary' ? '$background' : tone === 'active' ? '$color1' : '$color11'
  return (
    <XStack
      ai="center"
      gap="$1.5"
      px="$2.5"
      py="$1"
      br="$10"
      backgroundColor={completed ? BRAND_COLORS.primary : backgroundColor}
    >
      {Icon ? <Icon size={14} color={completed ? '$background' : color} /> : null}
      <Paragraph size="$2" color={completed ? '$background' : color} fontWeight="600">
        {label}
      </Paragraph>
    </XStack>
  )
}

const BADGE_SHIELD_PATH =
  'M12 2H60C64 2 68 6 68 10V46C68 60 58 72 44 78L36 84L28 78C14 72 4 60 4 46V10C4 6 8 2 12 2Z'

const BadgeTile = ({
  label,
  icon: Icon,
  completed,
}: {
  label: string
  icon: typeof Shield
  completed: boolean
}) => {
  const theme = useTheme()
  const backgroundColor = completed ? theme.color1?.val : theme.color2?.val
  const borderColor = completed ? BRAND_COLORS.primary : theme.color4?.val
  const labelColor = completed ? '$color12' : '$color10'
  const iconColor = completed ? BRAND_COLORS.primary : '$color10'
  const shieldFill = backgroundColor ?? theme.background?.val ?? 'transparent'
  const shieldStroke = borderColor ?? theme.borderColor?.val ?? 'transparent'
  return (
    <YStack
      w={96}
      h={112}
      ai="center"
      jc="center"
      gap="$1"
      position="relative"
    >
      <Svg width="100%" height="100%" viewBox="0 0 72 88" style={{ position: 'absolute' }}>
        <Path
          d={BADGE_SHIELD_PATH}
          fill={shieldFill}
          stroke={shieldStroke}
          strokeWidth={2}
        />
      </Svg>
      <YStack ai="center" jc="center" px="$2" position="absolute">
        <Paragraph size="$2" color={labelColor} fontWeight="600" textAlign="center">
          {label}
        </Paragraph>
      </YStack>
      {completed ? (
        <XStack
          position="absolute"
          top="$1.5"
          right="$1.5"
          w={20}
          h={20}
          br="$10"
          backgroundColor={BRAND_COLORS.primary}
          ai="center"
          jc="center"
        >
          <Check size={12} color="$background" />
        </XStack>
      ) : null}
    </YStack>
  )
}

const MetricCard = ({
  label,
  value,
  rankLabel,
  isLoading,
  highlight = false,
}: MetricCardProps & { highlight?: boolean }) => (
  <YStack
    flex={1}
    gap="$0.5"
    ai="center"
    p={highlight ? '$2.5' : undefined}
    br={highlight ? '$6' : undefined}
    borderWidth={highlight ? 1 : undefined}
    borderColor={highlight ? '$color4' : undefined}
    backgroundColor={highlight ? '$color1' : undefined}
  >
    <SizableText size="$6" fontWeight="700">
      {isLoading ? '—' : value}
    </SizableText>
    <Paragraph theme="alt2" size="$2" textAlign="center">
      {label}
    </Paragraph>
    {rankLabel ? (
      <Paragraph size="$1" theme="alt2" textAlign="center">
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
  if (role === 'owner') return 'Owner'
  if (role === 'admin') return 'Admin'
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

const BADGE_TIERS = [
  { id: 'rookie', label: 'Rookie', minGames: 5 },
  { id: 'player', label: 'Player', minGames: 15 },
  { id: 'legend', label: 'Legend', minGames: 30 },
] as const
const IRONMAN_STREAK = 5

type BadgeTier = (typeof BADGE_TIERS)[number]

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
    { label: 'As captain', value: `${stats.gamesAsCaptain}`, rankLabel: rankLabel(entry?.captainRank) },
    { label: 'Games played', value: `${stats.games}`, rankLabel: rankLabel(entry?.overallRank) },
    { label: 'Wins', value: `${stats.wins}`, rankLabel: rankLabel(entry?.winsRank) },
    { label: 'Losses', value: `${stats.losses}` },
    { label: 'Goal diff', value: `${stats.goalDiff}`, rankLabel: rankLabel(entry?.goalDiffRank) },
    { label: 'Goals for', value: `${stats.goalsFor}` },
    { label: 'Goals against', value: `${stats.goalsAgainst}` },
  ].filter(Boolean) as MetricCardProps[]
}

const formatStatus = (status: string) => {
  if (status === 'completed') return 'Completed'
  if (status === 'cancelled') return 'Cancelled'
  return 'Scheduled'
}

const getTierProgress = (games: number) => {
  const progress = BADGE_TIERS.map((tier) => {
    const currentCount = Math.min(games, tier.minGames)
    const percent = tier.minGames ? Math.min(currentCount / tier.minGames, 1) : 1
    return {
      tier,
      currentCount,
      percent,
      unlocked: games >= tier.minGames,
    }
  })
  const current = progress.filter((entry) => entry.unlocked).pop()?.tier ?? null
  return { current, progress }
}

const buildBadges = (
  role: string,
  stats: StatSnapshot,
  tier: BadgeTier | null,
  attendanceStreak: number
) => {
  const badges: Array<{ label: string; icon: typeof Shield; tone?: PillTone }> = []

  if (tier) {
    badges.push({ label: tier.label, icon: Star, tone: 'active' })
  }
  badges.push({
    label: formatRole(role),
    icon: Shield,
    tone: role === 'admin' || role === 'owner' ? 'primary' : 'neutral',
  })

  if (attendanceStreak >= IRONMAN_STREAK) {
    badges.push({ label: 'Ironman', icon: Trophy })
  }
  if (stats.gamesAsCaptain > 0) {
    badges.push({ label: 'Capitan', icon: Shield })
  }
  return badges
}

const getAttendanceStreak = (games: GameListItem[]) => {
  let streak = 0
  for (const game of games) {
    if (game.status !== 'completed') continue
    if (game.userStatus !== 'rostered') break
    streak += 1
  }
  return streak
}
