import { useEffect, useMemo, useState } from 'react'
import { Star } from '@tamagui/lucide-icons'

import { Card, Paragraph, Separator, Sheet, SizableText, XStack, YStack } from '@my/ui/public'
import { AvatarPreviewOverlay } from 'app/components/AvatarPreviewOverlay'
import { RatingBlock } from 'app/components/RatingBlock'
import { UserAvatar } from 'app/components/UserAvatar'
import { useBrand } from 'app/provider/brand'
import { api, type RouterOutputs } from 'app/utils/api'
import { formatNationalityDisplay, formatPhoneDisplay } from 'app/utils/phone'

import type { GameStatus, QueueEntry } from '../types'
import { RecentFormChips } from './RecentFormChips'

const STAR_VALUES = [1, 2, 3, 4, 5]

type RosterPlayerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: QueueEntry | null
  gameStatus?: GameStatus
  communityId?: string | null
}

export const RosterPlayerSheet = ({
  open,
  onOpenChange,
  entry,
  gameStatus,
  communityId,
}: RosterPlayerSheetProps) => {
  const { primaryColor } = useBrand()
  const profileId = entry?.profileId ?? null
  const isGuest = entry?.isGuest ?? false
  const leaderboardQuery = api.stats.leaderboard.useQuery(
    { communityId: communityId ?? '' },
    { enabled: open && Boolean(profileId) && Boolean(communityId) }
  )
  const ratingQuery = api.stats.profileCommunityRating.useQuery(
    { communityId: communityId ?? '', profileId: profileId ?? '' },
    {
      enabled: open && Boolean(profileId) && Boolean(communityId) && !isGuest,
    }
  )
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
  const [avatarOpen, setAvatarOpen] = useState(false)

  useEffect(() => {
    if (!open) setAvatarOpen(false)
  }, [open])

  if (!entry) return null

  const isCompleted = gameStatus === 'completed'
  const canShowRating = !isGuest && Boolean(communityId) && Boolean(profileId)
  const name = isGuest ? entry.guest?.name?.trim() || 'Guest' : entry.player.name ?? 'Player'
  const avatarUrl = isGuest ? null : entry.player.avatarUrl ?? null
  const canPreviewAvatar = Boolean(avatarUrl)
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
  const guestAddedBy = isGuest ? entry.guest?.addedByName?.trim() : null
  const guestNotes = isGuest ? entry.guest?.notes?.trim() : null
  const guestPhone = isGuest ? formatPhoneDisplay(entry.guest?.phone) : null
  const guestRating = isGuest ? entry.guest?.rating ?? null : null
  const nationalityLabel = !isGuest ? formatNationalityDisplay(entry.player.nationality) : ''
  const metaLine = nationalityLabel
  const summary = isStatsLoading
    ? 'Dialing in the record…'
    : stats.games
      ? `Winning ${formatPercent(stats.winRate)} of ${stats.games} runs`
      : 'No games logged yet.'

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        modal
        snapPoints={[65]}
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
        <Sheet.Frame backgroundColor="$background" borderColor="$color12" borderWidth={1} position="relative">
          <YStack px="$4" pt="$4" pb="$3" gap="$3">
            <XStack ai="center" jc="space-between" gap="$3">
              <XStack ai="center" gap="$3" flex={1} minWidth={0}>
                {canPreviewAvatar ? (
                  <YStack
                    onPress={() => setAvatarOpen(true)}
                    pressStyle={{ opacity: 0.85 }}
                    accessibilityRole="button"
                  >
                    <UserAvatar size={64} name={name} avatarUrl={avatarUrl} />
                  </YStack>
                ) : (
                  <UserAvatar size={64} name={name} avatarUrl={avatarUrl} />
                )}
                <YStack gap="$0.5" flex={1} minWidth={0}>
                  <XStack ai="center" jc="space-between" gap="$2">
                    <SizableText size="$6" fontWeight="700" numberOfLines={1} flex={1} minWidth={0}>
                      {name}
                    </SizableText>
                    <Paragraph theme="alt2" size="$2" color={statusColor}>
                      {statusLabel}
                    </Paragraph>
                  </XStack>
                  {metaLine ? (
                    <Paragraph theme="alt2" size="$2">
                      {metaLine}
                    </Paragraph>
                  ) : null}
                  {isGuest && guestRating ? (
                    <XStack gap="$0.5" ai="center">
                      {STAR_VALUES.map((value) => {
                        const active = value <= guestRating
                        return (
                          <Star
                            key={value}
                            size={16}
                            color={active ? primaryColor : '$color8'}
                            fill={active ? primaryColor : 'transparent'}
                          />
                        )
                      })}
                    </XStack>
                  ) : !isGuest ? (
                    <RecentFormChips recentForm={recentForm} />
                  ) : null}
                </YStack>
              </XStack>
            </XStack>
            <YStack h={2} w={56} br={999} bg={primaryColor} />
          </YStack>
          <Separator />
          <YStack px="$4" py="$3" gap="$3">
            {isGuest ? (
              <>
                {guestPhone ? <InfoRow label="Phone" value={guestPhone} /> : null}
                {guestNotes ? <InfoRow label="Style of play" value={guestNotes} /> : null}
                {guestAddedBy ? <InfoRow label="Added by" value={guestAddedBy} /> : null}
              </>
            ) : (
              <Card bordered bw={1} boc="$color12" br="$5" p="$4" gap="$3">
                <XStack ai="center" jc="space-between" gap="$3" flexWrap="wrap">
                  <YStack gap="$1" flex={1}>
                    <SizableText size="$5" fontWeight="600" textTransform="uppercase">
                      Performance
                    </SizableText>
                    <Paragraph theme="alt2">{summary}</Paragraph>
                  </YStack>
                  {canShowRating ? (
                    <YStack alignSelf="flex-start">
                      <RatingBlock
                        rating={ratingQuery.data?.rating}
                        ratedGames={ratingQuery.data?.ratedGames}
                      />
                    </YStack>
                  ) : null}
                </XStack>
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
              </Card>
            )}
          </YStack>
          <AvatarPreviewOverlay
            open={canPreviewAvatar && avatarOpen}
            uri={avatarUrl}
            onClose={() => setAvatarOpen(false)}
          />
        </Sheet.Frame>
      </Sheet>
    </>
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
    return `Rank #${rank}`
  }

  return [
    { label: 'Win rate', value: formatPercent(stats.winRate), rankLabel: rankLabel(entry?.overallRank) },
    { label: 'As captain', value: `${stats.gamesAsCaptain}`, rankLabel: rankLabel(entry?.captainRank) },
    { label: 'Games', value: `${stats.games}`, rankLabel: rankLabel(entry?.overallRank) },
    { label: 'Wins', value: `${stats.wins}`, rankLabel: rankLabel(entry?.winsRank) },
    { label: 'Losses', value: `${stats.losses}` },
    { label: 'GD', value: `${stats.goalDiff}`, rankLabel: rankLabel(entry?.goalDiffRank) },
    { label: 'GF', value: `${stats.goalsFor}` },
    { label: 'GA', value: `${stats.goalsAgainst}` },
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
    gap="$1"
    ai="center"
    p="$2.5"
    br="$5"
    borderWidth={1}
    borderColor="$color12"
    backgroundColor={highlight ? '$color1' : 'transparent'}
  >
    <SizableText size="$6" fontWeight="700">
      {isLoading ? '—' : value}
    </SizableText>
    <YStack gap="$0.75" ai="center">
      <SizableText size="$3" fontWeight="500" textAlign="center">
        {label}
      </SizableText>
      {rankLabel ? (
        <XStack
          ai="center"
          jc="center"
          px="$1.5"
          py="$0.5"
          br="$10"
          borderWidth={1}
          borderColor="$color4"
          backgroundColor="$color2"
        >
          <Paragraph size="$1" color="$color11" fontWeight="600" textAlign="center">
            {rankLabel}
          </Paragraph>
        </XStack>
      ) : null}
    </YStack>
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
