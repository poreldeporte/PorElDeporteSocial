import { Image, Share, StyleSheet, type ImageSourcePropType, type ScrollViewProps } from 'react-native'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementRef,
  type ReactNode,
} from 'react'
import { Path, Svg } from 'react-native-svg'
import { useLink } from 'solito/link'

import {
  Button,
  Card,
  Paragraph,
  ScrollView,
  SizableText,
  XStack,
  YStack,
  useTheme,
  useToastController,
} from '@my/ui/public'
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  Shield,
  Star,
  Trophy,
} from '@tamagui/lucide-icons'
import {
  bannerPed,
  captainBadge,
  ironmanBadge,
  legendBadge,
  memberBadge,
  ownerBadge,
  playerBadge,
  rookeBadge,
} from 'app/assets'
import { screenContentContainerStyle } from 'app/constants/layout'
import { BrandStamp } from 'app/components/BrandStamp'
import { FloatingCtaDock } from 'app/components/FloatingCtaDock'
import { InfoPopup } from 'app/components/InfoPopup'
import { RatingBlock } from 'app/components/RatingBlock'
import { SectionCard } from 'app/components/SectionCard'
import { UserAvatar } from 'app/components/UserAvatar'
import { UploadAvatar } from 'app/features/settings/components/upload-avatar'
import { UploadCommunityBanner } from 'app/features/settings/components/upload-community-banner'
import type { GameListItem } from 'app/features/games/types'
import { HistoryGameCard } from 'app/features/games/components/HistoryGameCard'
import { useBrand } from 'app/provider/brand'
import { emptyBirthDateParts, formatBirthDateParts, parseBirthDateParts } from 'app/utils/birthDate'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useGamesListRealtime, useStatsRealtime } from 'app/utils/useRealtimeSync'
import { useRealtimeEnabled } from 'app/utils/useRealtimeEnabled'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import { api } from 'app/utils/api'
import { formatPhoneDisplay, parsePhoneToE164 } from 'app/utils/phone'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ProfileDetails, type ProfileDraft, type ProfileEditSection } from './profile-details'
import { profileUpdateFieldSchema } from './profile-field-schema'

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

type ProfileRow = {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  nationality: string | null
  birth_date: string | null
  jersey_number: number | null
  position: string | null
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

type BadgeId = 'rookie' | 'player' | 'legend' | 'member' | 'owner' | 'ironman' | 'captain'

type BadgeDefinition = {
  badgeId?: BadgeId
  label: string
  icon: typeof Shield
  tone?: PillTone
  image?: ImageSourcePropType
}

export const ProfileScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const data = useProfileData()
  const editor = useProfileEditor({
    profile: data.profile,
    user: data.user,
    userId: data.userId,
  })
  const showDock = editor.isDirty
  const scrollRef = useRef<ElementRef<typeof ScrollView> | null>(null)
  const [detailsOffset, setDetailsOffset] = useState(0)
  const scrollToDetails = useCallback(() => {
    if (!detailsOffset || !scrollRef.current) return
    scrollRef.current.scrollTo({ y: Math.max(0, detailsOffset - 12), animated: true })
  }, [detailsOffset])
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
    <YStack f={1}>
      <ScrollView ref={scrollRef} {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
        {headerSpacer}
        <YStack maw={900} mx="auto" w="100%" space="$4">
          <ProfileHero
            name={data.displayName}
            avatarUrl={data.avatarUrl}
            phone={data.profile?.phone}
            stats={data.stats}
            rating={data.rating}
            ratedGames={data.ratedGames}
            coverImageUrl={data.communityBannerUrl}
            communityId={data.communityId}
            canEditAvatar
            canEditBanner={data.isAdmin}
            onPressName={scrollToDetails}
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
          <BadgeSection
            role={data.role}
            stats={data.stats}
            attendanceStreak={data.attendanceStreak}
          />
          <YStack onLayout={(event) => setDetailsOffset(event.nativeEvent.layout.y)}>
            <ProfileDetails
              firstName={data.profile?.first_name}
              lastName={data.profile?.last_name}
              email={data.profileEmail}
              phone={data.profile?.phone}
              address={data.profile?.address}
              city={data.profile?.city}
              state={data.profile?.state}
              nationality={data.profile?.nationality}
              birthDate={data.profile?.birth_date}
              jerseyNumber={data.profile?.jersey_number}
              position={data.profile?.position}
              editor={{
                draft: editor.draft,
                activeSection: editor.activeSection,
                onSectionToggle: editor.toggleSection,
                onDraftChange: editor.updateDraft,
              }}
            />
          </YStack>
          <BrandStamp />
        </YStack>
      </ScrollView>
      {showDock ? (
        <FloatingSaveDock
          disabled={editor.isSaving}
          onCancel={editor.discard}
          onSave={editor.save}
        />
      ) : null}
    </YStack>
  )
}

const useProfileData = () => {
  const { profile, avatarUrl, user, displayName, role, isAdmin } = useUser()
  const { activeCommunityId } = useActiveCommunity()
  const realtimeEnabled = useRealtimeEnabled(Boolean(activeCommunityId))
  useGamesListRealtime(realtimeEnabled, activeCommunityId)
  const historyLink = useLink({ href: '/games/history' })
  const leaderboardQuery = api.stats.leaderboard.useQuery(
    { communityId: activeCommunityId ?? '' },
    { enabled: Boolean(activeCommunityId) }
  )
  const historyQuery = api.games.list.useQuery(
    { scope: 'past', communityId: activeCommunityId ?? '' },
    { enabled: Boolean(activeCommunityId) }
  )
  const communityQuery = api.community.defaults.useQuery(
    { communityId: activeCommunityId ?? '' },
    { enabled: Boolean(activeCommunityId) }
  )
  useStatsRealtime(realtimeEnabled, activeCommunityId)
  const ratingQuery = api.stats.myCommunityRating.useQuery(
    { communityId: activeCommunityId ?? '' },
    { enabled: Boolean(activeCommunityId) }
  )

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
    user,
    avatarUrl,
    displayName: displayName || 'Member',
    role,
    isAdmin,
    userId: user?.id ?? '',
    communityId: activeCommunityId ?? null,
    communityBannerUrl: communityQuery.data?.bannerUrl ?? null,
    stats,
    performance,
    recentForm,
    recentGames,
    attendanceStreak,
    isStatsLoading: leaderboardQuery.isLoading,
    isHistoryLoading: historyQuery.isLoading,
    rating: ratingQuery.data?.rating ?? 1500,
    ratedGames: ratingQuery.data?.ratedGames ?? 0,
    historyError: Boolean(historyQuery.error),
    onHistoryRetry: historyQuery.refetch,
    historyLink,
    profileEmail: profile?.email ?? user?.email ?? null,
  }
}

const useProfileEditor = ({
  profile,
  user,
  userId,
}: {
  profile: ProfileRow | null | undefined
  user: { email?: string | null; phone?: string | null } | null | undefined
  userId: string
}) => {
  const supabase = useSupabase()
  const toast = useToastController()
  const queryClient = useQueryClient()
  const apiUtils = api.useUtils()
  const baseDraft = useMemo(() => buildProfileDraft(profile, user), [profile, user])
  const [draft, setDraft] = useState<ProfileDraft>(baseDraft)
  const [baseline, setBaseline] = useState<ProfileDraft>(baseDraft)
  const [activeSection, setActiveSection] = useState<ProfileEditSection | null>(null)
  const isDirty = useMemo(() => !isProfileDraftEqual(draft, baseline), [draft, baseline])
  const dirtyRef = useRef(isDirty)

  useEffect(() => {
    dirtyRef.current = isDirty
  }, [isDirty])

  useEffect(() => {
    setBaseline(baseDraft)
    if (!dirtyRef.current) {
      setDraft(baseDraft)
    }
  }, [baseDraft])

  const updateDraft = useCallback((update: Partial<ProfileDraft>) => {
    setDraft((prev) => ({ ...prev, ...update }))
  }, [])

  const toggleSection = useCallback((section: ProfileEditSection) => {
    setActiveSection((current) => (current === section ? null : section))
  }, [])

  const mutation = useMutation({
    mutationFn: async (values: ProfileDraft) => {
      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        address: values.address.trim() || undefined,
        city: values.city.trim(),
        state: values.state.trim().toUpperCase(),
        nationality: values.nationality.trim(),
        birthDate: values.birthDate,
        jerseyNumber: Number(values.jerseyNumber),
        position: values.position,
      }
      const result = profileUpdateFieldSchema.safeParse(payload)
      if (!result.success) {
        const message = result.error.issues[0]?.message ?? 'Check your profile details.'
        throw new Error(message)
      }
      const birthDate = formatBirthDateParts(result.data.birthDate)
      if (!birthDate) {
        throw new Error('Enter a valid birth date.')
      }
      const normalizedPhone = parsePhoneToE164(result.data.phone, 'US')
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: result.data.firstName,
          last_name: result.data.lastName,
          email: result.data.email,
          phone: normalizedPhone ?? result.data.phone,
          address: result.data.address?.trim() || null,
          city: result.data.city.trim(),
          state: result.data.state.trim().toUpperCase(),
          nationality: result.data.nationality?.trim() || null,
          name: `${result.data.firstName} ${result.data.lastName}`.trim(),
          birth_date: birthDate,
          jersey_number: result.data.jerseyNumber,
          position: result.data.position.join(','),
        })
        .eq('id', userId)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: async (_, values) => {
      setBaseline(values)
      setDraft(values)
      setActiveSection(null)
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      await apiUtils.greeting.invalidate()
      toast.show('Successfully updated!')
    },
    onError: (error: Error) => {
      toast.show('Unable to update profile', { message: error.message })
    },
  })

  const save = useCallback(() => {
    if (!userId) return
    mutation.mutate(draft)
  }, [draft, mutation, userId])

  const discard = useCallback(() => {
    setDraft(baseline)
    setActiveSection(null)
  }, [baseline])

  return {
    draft,
    activeSection,
    updateDraft,
    toggleSection,
    isDirty,
    isSaving: mutation.isPending,
    save,
    discard,
  }
}

const buildProfileDraft = (
  profile: ProfileRow | null | undefined,
  user?: { email?: string | null; phone?: string | null } | null
): ProfileDraft => {
  const rawPhone = profile?.phone ?? user?.phone ?? ''
  const phone = formatPhoneDisplay(rawPhone) || rawPhone
  return {
    firstName: profile?.first_name ?? '',
    lastName: profile?.last_name ?? '',
    email: profile?.email ?? user?.email ?? '',
    phone,
    address: profile?.address ?? '',
    city: profile?.city ?? '',
    state: profile?.state ?? '',
    nationality: profile?.nationality ?? '',
    birthDate: parseBirthDateParts(profile?.birth_date) ?? emptyBirthDateParts(),
    jerseyNumber: profile?.jersey_number ? String(profile.jersey_number) : '',
    position: parsePositionList(profile?.position),
  }
}

const parsePositionList = (value?: string | null) => {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const isProfileDraftEqual = (next: ProfileDraft, prev: ProfileDraft) => {
  if (next.firstName !== prev.firstName) return false
  if (next.lastName !== prev.lastName) return false
  if (next.email !== prev.email) return false
  if (next.phone !== prev.phone) return false
  if (next.address !== prev.address) return false
  if (next.city !== prev.city) return false
  if (next.state !== prev.state) return false
  if (next.nationality !== prev.nationality) return false
  if (next.jerseyNumber !== prev.jerseyNumber) return false
  if (next.birthDate.month !== prev.birthDate.month) return false
  if (next.birthDate.day !== prev.birthDate.day) return false
  if (next.birthDate.year !== prev.birthDate.year) return false
  if (next.position.length !== prev.position.length) return false
  for (let i = 0; i < next.position.length; i += 1) {
    if (next.position[i] !== prev.position[i]) return false
  }
  return true
}

const ProfileHero = ({
  name,
  avatarUrl,
  phone,
  stats,
  rating,
  ratedGames,
  coverImageUrl,
  canEditAvatar,
  canEditBanner,
  communityId,
  onPressName,
}: {
  name: string
  avatarUrl: string | null
  phone?: string | null
  stats: StatSnapshot
  rating: number
  ratedGames: number
  coverImageUrl?: string | null
  canEditAvatar?: boolean
  canEditBanner?: boolean
  communityId?: string | null
  onPressName?: () => void
}) => {
  const [ratingInfoOpen, setRatingInfoOpen] = useState(false)
  const phoneLabel = formatPhoneDisplay(phone) || 'Add phone'
  const coverSource: ImageSourcePropType = coverImageUrl ? { uri: coverImageUrl } : bannerPed

  const bannerHeight = 180
  const avatarSize = 112
  const avatarInset = 16
  const contentTopPadding = avatarSize / 2 + 16
  const avatarNode = canEditAvatar ? (
    <UploadAvatar avatarUrl={avatarUrl}>
      <UserAvatar size={avatarSize} name={name} avatarUrl={avatarUrl} />
    </UploadAvatar>
  ) : (
    <UserAvatar size={avatarSize} name={name} avatarUrl={avatarUrl} />
  )

  const bannerContent = (
    <YStack h={bannerHeight} w="100%" bg="$color3" position="relative" overflow="hidden">
      <Image source={coverSource} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
    </YStack>
  )

  const bannerNode =
    canEditBanner && communityId ? (
      <UploadCommunityBanner communityId={communityId}>{bannerContent}</UploadCommunityBanner>
    ) : (
      bannerContent
    )

  const ratingBullets = [
    'You start at 1500.',
    'After 3 rated games, your rating becomes visible.',
    "Your team's rating is compared to the other team's rating.",
    'Wins move it up, losses move it down, draws keep it steady.',
    'Big upsets or larger score margins move it a bit more.',
  ]

  return (
    <>
      <Card
        bordered
        bw={1}
        boc="$color12"
        br="$5"
        borderStyle="solid"
        overflow="hidden"
      >
        <YStack position="relative">
          {bannerNode}
          <YStack
            position="absolute"
            top={bannerHeight - avatarSize / 2}
            left={avatarInset}
            zIndex={2}
            elevation={2}
            bg="$background"
            p="$1"
            br={999}
            bw={1}
            boc="$color12"
          >
            {avatarNode}
          </YStack>
        </YStack>
        <YStack px="$4" pt={contentTopPadding} pb="$4" gap="$3" bg="$background">
          <XStack ai="center" jc="space-between" gap="$4">
            <YStack f={1} gap="$3">
              <YStack gap="$1">
                <XStack
                  ai="center"
                  gap="$1.5"
                  onPress={onPressName}
                  pressStyle={onPressName ? { opacity: 0.7 } : undefined}
                  cur={onPressName ? 'pointer' : undefined}
                >
                  <SizableText size="$6" fontWeight="700">
                    {name}
                  </SizableText>
                  <ChevronDown size={16} color="$color10" />
                </XStack>
                <Paragraph theme="alt2" size="$2">
                  {phoneLabel}
                </Paragraph>
              </YStack>
              <XStack ai="center" gap="$4">
                <StatBlock label="Games" value={stats.games} />
                <YStack w={1} h={28} bg="$color4" />
                <StatBlock label="Wins" value={stats.wins} />
                <YStack w={1} h={28} bg="$color4" />
                <StatBlock label="Losses" value={stats.losses} />
              </XStack>
            </YStack>
            <YStack ai="center" jc="center" gap="$1.5">
              <YStack
                w={104}
                h={104}
                br={52}
                bw={1}
                boc="$color12"
                bg="$background"
                theme="light"
                ai="center"
                jc="center"
                position="relative"
                onPress={() => setRatingInfoOpen(true)}
                pressStyle={{ opacity: 0.85 }}
                accessibilityRole="button"
                accessibilityLabel="Community rating info"
              >
                <YStack
                  position="absolute"
                  top={6}
                  right={6}
                  w={18}
                  h={18}
                  br={999}
                  bg="$color12"
                  ai="center"
                  jc="center"
                >
                  <SizableText size="$1" fontWeight="700" color="$background">
                    ?
                  </SizableText>
                </YStack>
                <RatingBlock
                  rating={rating}
                  ratedGames={ratedGames}
                  align="center"
                  showLabel={false}
                  insideLabel="rating"
                  textColor="$color12"
                  accentColor="$color12"
                />
              </YStack>
            </YStack>
          </XStack>
        </YStack>
      </Card>
      <InfoPopup
        open={ratingInfoOpen}
        onOpenChange={setRatingInfoOpen}
        title="Community Rating"
        description="This rating reflects how you're doing in this community and updates after every rated game."
        bullets={ratingBullets}
        footer="Play more games to sharpen your rating."
      />
    </>
  )
}

const StatBlock = ({ label, value }: { label: string; value: number }) => {
  return (
    <YStack gap="$1">
      <SizableText size="$4" fontWeight="700">
        {value}
      </SizableText>
      <Paragraph theme="alt2" size="$2">
        {label}
      </Paragraph>
    </YStack>
  )
}

const FloatingSaveDock = ({
  onSave,
  onCancel,
  disabled,
}: {
  onSave: () => void
  onCancel: () => void
  disabled: boolean
}) => {
  return (
    <FloatingCtaDock transparent>
      <XStack gap="$2">
        <Button
          size="$3"
          br="$10"
          flex={1}
          onPress={onCancel}
          disabled={disabled}
          backgroundColor="$color1"
          borderColor="$color12"
          borderWidth={1}
          color="$color12"
          pressStyle={{ opacity: 0.85 }}
        >
          Cancel
        </Button>
        <Button
          size="$3"
          br="$10"
          flex={1}
          onPress={onSave}
          disabled={disabled}
          backgroundColor="$color12"
          borderColor="$color12"
          borderWidth={1}
          color="$color1"
          pressStyle={{ opacity: 0.85 }}
        >
          Save changes
        </Button>
      </XStack>
    </FloatingCtaDock>
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
  const { primaryColor } = useBrand()
  const [infoOpen, setInfoOpen] = useState(false)
  const subtitle = 'Track wins, goals, and rank as you play.'

  const hasGames = stats.games > 0
  const infoBullets = [
    'Only games you play are counted.',
    'Stats update after each completed game.',
    'Win rate is your wins divided by total games.',
    'GD is goals for minus goals against.',
    'Ranks show where you stand in the community.',
  ]

  return (
    <>
      <SectionCard
        title="Performance"
        description={subtitle}
        onInfoPress={() => setInfoOpen(true)}
        infoLabel="Performance info"
      >
        {hasGames ? (
          <>
            <YStack gap="$3">
              {[performance.slice(0, 2), performance.slice(2, 5), performance.slice(5, 8)].map(
                (row, rowIndex) => (
                  <XStack key={`performance-row-${rowIndex}`} gap="$3">
                    {row.map((metric) => (
                      <MetricCard
                        key={metric.label}
                        {...metric}
                        isLoading={isLoading}
                        highlight={rowIndex === 0}
                      />
                    ))}
                  </XStack>
                )
              )}
            </YStack>
            <RecentForm recentForm={recentForm} />
          </>
        ) : (
          <YStack ai="center" jc="center" py="$6" position="relative" overflow="hidden">
            <YStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              opacity={0.2}
              gap="$3"
            >
              {[0, 1].map((row) => (
                <XStack key={`ghost-row-${row}`} gap="$3">
                  {[0, 1].map((col) => (
                    <YStack
                      key={`ghost-card-${row}-${col}`}
                      f={1}
                      h={64}
                      br="$4"
                      bg="$color2"
                      borderWidth={1}
                      borderColor="$color12"
                    />
                  ))}
                </XStack>
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
                <BarChart3 size={32} color={primaryColor} />
              </YStack>
              <SizableText
                size="$3"
                fontWeight="700"
                textTransform="uppercase"
                letterSpacing={1.2}
                textAlign="center"
              >
                Play to unlock
              </SizableText>
              <Paragraph theme="alt2" textAlign="center">
                Performance stats appear after your first run.
              </Paragraph>
            </Card>
          </YStack>
        )}
      </SectionCard>
      <InfoPopup
        open={infoOpen}
        onOpenChange={setInfoOpen}
        title="Performance"
        description="Performance tracks your results inside this community across your games."
        bullets={infoBullets}
        footer="We’re investing in richer stats, keep playing. Next-level analytics are coming."
      />
    </>
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
  const { primaryColor } = useBrand()
  const viewAllButton = (
    <Button
      chromeless
      size="$2"
      px={0}
      py={0}
      color="$color10"
      pressStyle={{ opacity: 0.6 }}
      {...scheduleLink}
    >
      View all
    </Button>
  )
  return (
    <SectionCard
      title="Recent games"
      description="Analyze each game and leave a quick review."
      rightSlot={viewAllButton}
    >
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
        <YStack ai="center" jc="center" py="$6" position="relative" overflow="hidden">
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            opacity={0.2}
            gap="$3"
          >
            {[0, 1, 2].map((row) => (
              <YStack
                key={`ghost-game-${row}`}
                h={72}
                br="$5"
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
              No games yet
            </SizableText>
            <Paragraph theme="alt2" textAlign="center">
              Join your first run to start your history.
            </Paragraph>
          </Card>
        </YStack>
      ) : (
        <YStack gap="$3">
          {games.map((game) => (
            <HistoryGameCard key={game.id} game={game} />
          ))}
        </YStack>
      )}
    </SectionCard>
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
  const [infoOpen, setInfoOpen] = useState(false)
  const [badgeInfoId, setBadgeInfoId] = useState<BadgeId | null>(null)
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
  ]

  const infoBullets = [
    'Play games to unlock tier badges.',
    'Show up consistently to earn streak badges.',
    'Certain badges reflect your role or leadership.',
    'More badges appear as you progress.',
  ]
  const badgeInfo = badgeInfoId ? BADGE_INFO[badgeInfoId] : null

  return (
    <>
      <SectionCard
        title="Badges"
        description="Play, show up, and unlock milestones."
        onInfoPress={() => setInfoOpen(true)}
        infoLabel="Badges info"
      >
        <BadgeProgressList progress={progressRows} />
        <XStack gap="$2" flexWrap="wrap">
          {badges.map((badge) => (
            <BadgeTile
              key={badge.label}
              badgeId={badge.badgeId}
              label={badge.label}
              icon={badge.icon}
              image={badge.image}
              completed
              onPressImage={(id) => setBadgeInfoId(id)}
            />
          ))}
        </XStack>
      </SectionCard>
      <InfoPopup
        open={infoOpen}
        onOpenChange={setInfoOpen}
        title="Badges"
        description="Badges highlight your milestones and impact inside the community."
        bullets={infoBullets}
      />
      <InfoPopup
        open={Boolean(badgeInfo)}
        onOpenChange={(open) => {
          if (!open) setBadgeInfoId(null)
        }}
        title={badgeInfo?.title ?? ''}
        description={badgeInfo?.meaning ?? ''}
        bullets={badgeInfo ? [badgeInfo.earned] : undefined}
      />
    </>
  )
}

const BadgeProgressList = ({
  progress,
}: {
  progress: Array<{ id: string; label: string; valueLabel: string; percent: number }>
}) => {
  const { primaryColor } = useBrand()
  return (
    <YStack gap="$2">
      <Paragraph theme="alt2" size="$1" textTransform="uppercase" letterSpacing={1.5} textAlign="right">
        Progress
      </Paragraph>
      {progress.map(({ id, label, valueLabel, percent }) => (
        <YStack key={id} gap="$1">
          <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
            <BadgeStatusPill label={label} completed={percent >= 1} />
            <Paragraph theme="alt2" size="$2">
              {percent >= 1 ? 'Completed' : valueLabel}
            </Paragraph>
          </XStack>
          <YStack h={4} br="$10" backgroundColor="$color3" overflow="hidden">
            <YStack h="100%" w={`${Math.round(percent * 100)}%`} backgroundColor={primaryColor} />
          </YStack>
        </YStack>
      ))}
    </YStack>
  )
}

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
  const { primaryColor } = useBrand()
  const backgroundColor =
    tone === 'primary' ? primaryColor : tone === 'active' ? '$color9' : '$color3'
  const color = tone === 'primary' ? '$background' : tone === 'active' ? '$color1' : '$color11'
  return (
    <XStack
      ai="center"
      gap="$1.5"
      px="$2.5"
      py="$1"
      br="$10"
      backgroundColor={completed ? primaryColor : backgroundColor}
    >
      {Icon ? <Icon size={14} color={completed ? '$background' : color} /> : null}
      <Paragraph
        size="$1"
        color={completed ? '$background' : color}
        fontWeight="600"
        textTransform="uppercase"
        letterSpacing={1.1}
      >
        {label}
      </Paragraph>
    </XStack>
  )
}

const BADGE_SHIELD_PATH =
  'M12 2H60C64 2 68 6 68 10V46C68 60 58 72 44 78L36 84L28 78C14 72 4 60 4 46V10C4 6 8 2 12 2Z'

const BadgeTile = ({
  badgeId,
  label,
  icon: Icon,
  completed,
  image,
  onPressImage,
}: {
  badgeId?: BadgeId
  label: string
  icon: typeof Shield
  completed: boolean
  image?: ImageSourcePropType
  onPressImage?: (badgeId: BadgeId) => void
}) => {
  const { primaryColor } = useBrand()
  const theme = useTheme()
  const backgroundColor = completed ? theme.color1?.val : theme.color2?.val
  const borderColor = completed ? primaryColor : theme.color4?.val
  const labelColor = completed ? '$color12' : '$color10'
  const iconColor = completed ? primaryColor : '$color10'
  const shieldFill = backgroundColor ?? theme.background?.val ?? 'transparent'
  const shieldStroke = borderColor ?? theme.borderColor?.val ?? 'transparent'
  const hasImage = Boolean(image)
  const isPressable = Boolean(hasImage && completed && badgeId && onPressImage)
  const handleImagePress = () => {
    if (!badgeId || !onPressImage) return
    onPressImage(badgeId)
  }
  return (
    <YStack
      w="31%"
      aspectRatio={192 / 224}
      ai="center"
      jc="center"
      position="relative"
    >
      {hasImage ? (
        <YStack
          width="100%"
          height="100%"
          onPress={isPressable ? handleImagePress : undefined}
          pressStyle={isPressable ? { opacity: 0.85 } : undefined}
        >
          <Image
            source={image as ImageSourcePropType}
            resizeMode="contain"
            style={{ width: '100%', height: '100%' }}
          />
        </YStack>
      ) : (
        <>
          <Svg width="100%" height="100%" viewBox="0 0 72 88" style={{ position: 'absolute' }}>
            <Path
              d={BADGE_SHIELD_PATH}
              fill={shieldFill}
              stroke={shieldStroke}
              strokeWidth={2}
            />
          </Svg>
          <YStack ai="center" jc="center" px="$2" position="absolute">
            <Paragraph
              size="$1"
              color={labelColor}
              fontWeight="600"
              textAlign="center"
              textTransform="uppercase"
              letterSpacing={1.1}
            >
              {label}
            </Paragraph>
          </YStack>
        </>
      )}
      {completed ? (
        <XStack
          position="absolute"
          bottom="$2"
          left={0}
          right={0}
          ai="center"
          jc="center"
        >
          <XStack
            w={20}
            h={20}
            br="$10"
            backgroundColor={primaryColor}
            ai="center"
            jc="center"
          >
            <Check size={12} color="$background" />
          </XStack>
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
  const results = [...recentForm].reverse()
  if (!results.length) return null
  return (
    <YStack gap="$1">
      <Paragraph theme="alt2" size="$2">
        Recent form
      </Paragraph>
      <XStack gap="$1.5">
        {results.map((result, index) => (
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
  const badges: BadgeDefinition[] = []

  if (tier) {
    badges.push({
      badgeId: tier.id,
      label: tier.label,
      icon: Star,
      tone: 'active',
      image:
        tier.id === 'rookie'
          ? rookeBadge
          : tier.id === 'player'
            ? playerBadge
            : tier.id === 'legend'
              ? legendBadge
            : undefined,
    })
  }
  badges.push({
    badgeId: role === 'owner' ? 'owner' : role === 'member' ? 'member' : undefined,
    label: formatRole(role),
    icon: Shield,
    tone: role === 'admin' || role === 'owner' ? 'primary' : 'neutral',
    image: role === 'member' ? memberBadge : role === 'owner' ? ownerBadge : undefined,
  })

  if (attendanceStreak >= IRONMAN_STREAK) {
    badges.push({ badgeId: 'ironman', label: 'Ironman', icon: Trophy, image: ironmanBadge })
  }
  if (stats.gamesAsCaptain > 0) {
    badges.push({ badgeId: 'captain', label: 'Capitan', icon: Shield, image: captainBadge })
  }
  return badges
}

const BADGE_TIER_MIN_GAMES = BADGE_TIERS.reduce((acc, tier) => {
  acc[tier.id] = tier.minGames
  return acc
}, {} as Record<BadgeTier['id'], number>)

const BADGE_INFO: Record<BadgeId, { title: string; meaning: string; earned: string }> = {
  rookie: {
    title: 'Rookie',
    meaning: 'Every journey starts with a first run. This badge marks the moment you stepped in.',
    earned: `Earned after you play ${BADGE_TIER_MIN_GAMES.rookie} games.`,
  },
  player: {
    title: 'Player',
    meaning: "You've moved beyond the first steps. You show up, contribute, and belong.",
    earned: `Earned after you play ${BADGE_TIER_MIN_GAMES.player} games.`,
  },
  legend: {
    title: 'Legend',
    meaning: "Your name is part of the community's story. You've built real history here.",
    earned: `Earned after you play ${BADGE_TIER_MIN_GAMES.legend} games.`,
  },
  member: {
    title: 'Member',
    meaning: 'You belong here. This badge reflects your commitment to the community.',
    earned: 'Granted when you join a community.',
  },
  owner: {
    title: 'Owner',
    meaning: 'You carry the standards of the community and set its direction.',
    earned: 'Granted to community owners.',
  },
  ironman: {
    title: 'Ironman',
    meaning: 'Reliability under pressure. You show up when it counts.',
    earned: `Earned by attending ${IRONMAN_STREAK} games in a row.`,
  },
  captain: {
    title: 'Capitan',
    meaning: 'Leadership in motion. You take responsibility when the game is on the line.',
    earned: 'Earned after captaining at least one game.',
  },
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
