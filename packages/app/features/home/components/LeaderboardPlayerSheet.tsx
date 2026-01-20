import { useEffect, useMemo, useState } from 'react'
import { Image } from 'react-native'
import { Dialog } from 'tamagui'

import { Card, Paragraph, Separator, Sheet, SizableText, XStack, YStack } from '@my/ui/public'
import { RatingBlock } from 'app/components/RatingBlock'
import { UserAvatar } from 'app/components/UserAvatar'
import { BRAND_COLORS } from 'app/constants/colors'
import { RecentFormChips } from 'app/features/games/components/RecentFormChips'
import { api, type RouterOutputs } from 'app/utils/api'
import { formatNationalityDisplay } from 'app/utils/phone'

type LeaderboardEntry = RouterOutputs['stats']['leaderboard'][number]

type LeaderboardPlayerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: LeaderboardEntry | null
  communitySize: number
  communityId?: string | null
}

export const LeaderboardPlayerSheet = ({
  open,
  onOpenChange,
  entry,
  communitySize,
  communityId,
}: LeaderboardPlayerSheetProps) => {
  const profileId = entry?.profileId ?? ''
  const canShowRating = Boolean(communityId) && Boolean(profileId)
  const profileQuery = api.profiles.byId.useQuery(
    { profileId },
    { enabled: open && Boolean(profileId) }
  )
  const ratingQuery = api.stats.profileCommunityRating.useQuery(
    { communityId: communityId ?? '', profileId },
    { enabled: open && Boolean(profileId) && Boolean(communityId) }
  )
  const stats = useMemo(() => deriveStats(entry), [entry])
  const winRate = entry?.winRate ?? (stats.games ? stats.wins / stats.games : 0)
  const performance = useMemo(
    () => buildPerformanceMetrics(stats, entry, communitySize, winRate),
    [communitySize, entry, stats, winRate]
  )
  const recentForm = entry?.recent ?? []
  const [avatarOpen, setAvatarOpen] = useState(false)

  useEffect(() => {
    if (!open) setAvatarOpen(false)
  }, [open])

  if (!entry) return null

  const name = entry.name ?? 'Member'
  const avatarUrl = entry.avatarUrl ?? null
  const canPreviewAvatar = Boolean(avatarUrl)
  const nationalityLabel = formatNationalityDisplay(profileQuery.data?.nationality)
  const metaLine = nationalityLabel
  const summary = stats.games
    ? `Winning ${formatPercent(winRate)} of ${stats.games} games`
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
        <Sheet.Frame backgroundColor="$background" borderColor="$black1" borderWidth={1}>
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
                  <SizableText size="$6" fontWeight="700" numberOfLines={1} flex={1} minWidth={0}>
                    {name}
                  </SizableText>
                  {metaLine ? (
                    <Paragraph theme="alt2" size="$2">
                      {metaLine}
                    </Paragraph>
                  ) : null}
                  <RecentFormChips recentForm={recentForm} />
                </YStack>
              </XStack>
            </XStack>
            <YStack h={2} w={56} br={999} bg={BRAND_COLORS.primary} />
          </YStack>
          <Separator />
          <YStack px="$4" py="$3" gap="$3">
            <Card bordered bw={1} boc="$black1" br="$5" p="$4" gap="$3">
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
                          highlight={rowIndex === 0}
                        />
                      ))}
                    </XStack>
                  )
                )}
              </YStack>
            </Card>
          </YStack>
        </Sheet.Frame>
      </Sheet>
      {canPreviewAvatar ? (
        <Dialog modal open={avatarOpen} onOpenChange={setAvatarOpen}>
          <Dialog.Portal>
            <Dialog.Overlay
              key="overlay"
              animation="quick"
              o={0.5}
              enterStyle={{ o: 0 }}
              exitStyle={{ o: 0 }}
              onPress={() => setAvatarOpen(false)}
              zIndex={200000}
            />
            <Dialog.Content
              key="content"
              animation="quick"
              enterStyle={{ opacity: 0, scale: 0.92 }}
              exitStyle={{ opacity: 0, scale: 0.96 }}
              backgroundColor="transparent"
              borderWidth={0}
              p={0}
              ai="center"
              jc="center"
              zIndex={200001}
            >
              <YStack
                w="80%"
                maxWidth={320}
                aspectRatio={1}
                br={999}
                overflow="hidden"
                bg="$color2"
                onPress={() => setAvatarOpen(false)}
                pressStyle={{ opacity: 0.9 }}
                accessibilityRole="button"
              >
                <Image
                  source={{ uri: avatarUrl ?? '' }}
                  resizeMode="cover"
                  style={{ width: '100%', height: '100%' }}
                />
              </YStack>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog>
      ) : null}
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
}

const deriveStats = (entry: LeaderboardEntry | null): StatSnapshot => {
  const games = entry?.games ?? 0
  const wins = entry?.wins ?? 0
  const losses = entry?.losses ?? 0
  const goalsFor = entry?.goalsFor ?? 0
  const goalsAgainst = entry?.goalsAgainst ?? 0
  const goalDiff = entry?.goalDiff ?? goalsFor - goalsAgainst
  const winRate = entry?.winRate ?? (games ? wins / games : 0)
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
  entry: LeaderboardEntry | null,
  communitySize: number,
  winRate: number
) => {
  const rankLabel = (rank?: number | null) => {
    if (!rank || communitySize === 0) return undefined
    return `Rank #${rank}`
  }

  return [
    { label: 'Win rate', value: formatPercent(winRate), rankLabel: rankLabel(entry?.overallRank) },
    { label: 'As captain', value: `${stats.gamesAsCaptain}`, rankLabel: rankLabel(entry?.captainRank) },
    { label: 'Games', value: `${stats.games}`, rankLabel: rankLabel(entry?.overallRank) },
    { label: 'Wins', value: `${stats.wins}`, rankLabel: rankLabel(entry?.winsRank) },
    { label: 'Losses', value: `${stats.losses}` },
    { label: 'GD', value: `${stats.goalDiff}`, rankLabel: rankLabel(entry?.goalDiffRank) },
    { label: 'GF', value: `${stats.goalsFor}` },
    { label: 'GA', value: `${stats.goalsAgainst}` },
  ].filter(Boolean) as MetricCardProps[]
}

const MetricCard = ({ label, value, rankLabel, highlight = false }: MetricCardProps & { highlight?: boolean }) => (
  <YStack
    flex={1}
    gap="$1"
    ai="center"
    p="$2.5"
    br="$5"
    borderWidth={1}
    borderColor="$black1"
    backgroundColor={highlight ? '$color1' : 'transparent'}
  >
    <SizableText size="$6" fontWeight="700">
      {value}
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
