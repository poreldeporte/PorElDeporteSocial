import { useMemo } from 'react'

import { Paragraph, Separator, Sheet, SizableText, XStack, YStack } from '@my/ui/public'
import { UserAvatar } from 'app/components/UserAvatar'
import { BRAND_COLORS } from 'app/constants/colors'
import { api, type RouterOutputs } from 'app/utils/api'
import { formatPhoneDisplay } from 'app/utils/phone'

import type { GameStatus, QueueEntry } from '../types'
import { RecentFormChips } from './RecentFormChips'

type RosterPlayerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: QueueEntry | null
  gameStatus?: GameStatus
}

export const RosterPlayerSheet = ({
  open,
  onOpenChange,
  entry,
  gameStatus,
}: RosterPlayerSheetProps) => {
  const profileId = entry?.profileId ?? null
  const leaderboardQuery = api.stats.leaderboard.useQuery(undefined, {
    enabled: open && Boolean(profileId),
  })
  const leaderboardEntry = useMemo(() => {
    if (!profileId) return null
    return leaderboardQuery.data?.find((row) => row.profileId === profileId) ?? null
  }, [leaderboardQuery.data, profileId])
  const stats = useMemo(() => deriveStats(leaderboardEntry), [leaderboardEntry])
  const performance = useMemo(
    () => buildPerformanceMetrics(stats, leaderboardEntry, leaderboardQuery.data),
    [stats, leaderboardEntry, leaderboardQuery.data]
  )
  const recentForm = leaderboardEntry?.recent ?? []
  const isStatsLoading = leaderboardQuery.isLoading

  if (!entry) return null

  const isCompleted = gameStatus === 'completed'
  const isGuest = entry.isGuest
  const name = isGuest ? entry.guest?.name?.trim() || 'Guest' : entry.player.name ?? 'Player'
  const avatarUrl = isGuest ? null : entry.player.avatarUrl ?? null
  const statusLabel = entry.noShowAt
    ? 'No-show'
    : entry.tardyAt
      ? 'Tardy'
      : entry.status === 'rostered'
        ? isCompleted || entry.attendanceConfirmedAt
          ? 'Confirmed'
          : 'Rostered'
        : entry.status === 'waitlisted'
          ? 'Waitlisted'
          : 'Dropped'
  const statusColor = entry.noShowAt ? '$red10' : entry.tardyAt ? '$yellow10' : undefined
  const guestPhone = isGuest ? formatPhoneDisplay(entry.guest?.phone) : null
  const guestAddedBy = isGuest ? entry.guest?.addedByName?.trim() : null
  const guestNotes = isGuest ? entry.guest?.notes?.trim() : null
  const summary = isStatsLoading
    ? 'Dialing in the record…'
    : stats.games
      ? `Winning ${formatPercent(stats.winRate)} of ${stats.games} runs`
      : 'No games logged yet.'

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      modal
      snapPoints={[55]}
      snapPointsMode="percent"
      dismissOnSnapToBottom
      dismissOnOverlayPress
      animationConfig={{ type: 'spring', damping: 20, mass: 1.2, stiffness: 250 }}
    >
      <Sheet.Overlay
        opacity={0.5}
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        zIndex={0}
      />
      <Sheet.Frame backgroundColor="$background">
        <YStack px="$4" pt="$4" pb="$3" gap="$3">
          <XStack ai="center" jc="space-between" gap="$3">
            <XStack ai="center" gap="$3" flex={1} minWidth={0}>
              <UserAvatar size={64} name={name} avatarUrl={avatarUrl} />
              <YStack gap="$0.5" flex={1} minWidth={0}>
                <XStack ai="center" jc="space-between" gap="$2">
                  <SizableText size="$6" fontWeight="700" numberOfLines={1} flex={1} minWidth={0}>
                    {name}
                  </SizableText>
                  <Paragraph theme="alt2" size="$2" color={statusColor}>
                    {statusLabel}
                  </Paragraph>
                </XStack>
                {!isGuest ? <RecentFormChips recentForm={recentForm} /> : null}
              </YStack>
            </XStack>
          </XStack>
          <YStack h={2} w={56} br={999} bg={BRAND_COLORS.primary} />
        </YStack>
        <Separator />
        <YStack px="$4" py="$3" gap="$3">
          {isGuest ? (
            <>
              {guestPhone ? <InfoRow label="Phone" value={guestPhone} /> : null}
              {guestAddedBy ? <InfoRow label="Added by" value={guestAddedBy} /> : null}
              {guestNotes ? <InfoRow label="Notes" value={guestNotes} /> : null}
            </>
          ) : (
            <>
              <YStack gap="$2">
                <SizableText size="$5" fontWeight="600">
                  Performance
                </SizableText>
                <Paragraph theme="alt2">{summary}</Paragraph>
              </YStack>
              <YStack gap="$3">
                {[performance.slice(0, 2), performance.slice(2, 5), performance.slice(5, 8)].map(
                  (row, rowIndex) => (
                    <XStack key={`performance-row-${rowIndex}`} gap="$3">
                      {row.map((metric) => (
                        <MetricCard
                          key={metric.label}
                          {...metric}
                          isLoading={isStatsLoading}
                          highlight={rowIndex === 0}
                        />
                      ))}
                    </XStack>
                  )
                )}
              </YStack>
            </>
          )}
        </YStack>
      </Sheet.Frame>
    </Sheet>
  )
}

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

type LeaderboardRow = RouterOutputs['stats']['leaderboard'][number]

const deriveStats = (entry: LeaderboardRow | null): StatSnapshot => {
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
  entry: LeaderboardRow | null,
  leaderboard: LeaderboardRow[] | undefined
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


const formatPercent = (value: number) => `${Math.round((value || 0) * 100)}%`

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <YStack gap="$0.5">
      <Paragraph theme="alt2" size="$2">
        {label}
      </Paragraph>
      <SizableText fontWeight="600">{value}</SizableText>
    </YStack>
  )
}
