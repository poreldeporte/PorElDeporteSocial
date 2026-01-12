import { Image, Share, StyleSheet, type ScrollViewProps } from 'react-native'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Path, Svg } from 'react-native-svg'
import { useLink } from 'solito/link'
import { AlertDialog } from 'tamagui'

import {
  Button,
  Card,
  Paragraph,
  ScrollView,
  SizableText,
  Switch,
  XStack,
  YStack,
  useTheme,
  useToastController,
} from '@my/ui/public'
import { ArrowRight, Check, ChevronDown, Shield, Star, Trophy } from '@tamagui/lucide-icons'
import { bannerMerch } from 'app/assets'
import { BRAND_COLORS } from 'app/constants/colors'
import { getDockSpacer } from 'app/constants/dock'
import { screenContentContainerStyle } from 'app/constants/layout'
import { FloatingCtaDock } from 'app/components/FloatingCtaDock'
import { UserAvatar } from 'app/components/UserAvatar'
import { UploadAvatar } from 'app/features/settings/components/upload-avatar'
import type { GameListItem } from 'app/features/games/types'
import { HistoryGameCard } from 'app/features/games/components/HistoryGameCard'
import { useThemeSetting } from 'app/provider/theme'
import { useLogout } from 'app/utils/auth/logout'
import { emptyBirthDateParts, formatBirthDateParts, parseBirthDateParts } from 'app/utils/birthDate'
import { useGamesListRealtime, useStatsRealtime } from 'app/utils/useRealtimeSync'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
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

export const ProfileScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const data = useProfileData()
  const editor = useProfileEditor({
    profile: data.profile,
    user: data.user,
    userId: data.userId,
  })
  const insets = useSafeAreaInsets()
  const showDock = editor.isDirty
  const dockSpacer = showDock ? getDockSpacer(insets.bottom) : 0
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
      <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
        {headerSpacer}
        <YStack maw={900} mx="auto" w="100%" space="$4">
          <ProfileHero
            name={data.displayName}
            avatarUrl={data.avatarUrl}
            phone={data.profile?.phone}
            stats={data.stats}
            canEditAvatar
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
            editor={{
              draft: editor.draft,
              activeSection: editor.activeSection,
              onSectionToggle: editor.toggleSection,
              onDraftChange: editor.updateDraft,
            }}
          />
          {data.onLogout ? <LogoutSection onLogout={data.onLogout} /> : null}
          {showDock ? <YStack h={dockSpacer} /> : null}
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
  const { profile, avatarUrl, user, displayName, role } = useUser()
  useStatsRealtime(Boolean(user))
  useGamesListRealtime(Boolean(user))
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
    user,
    avatarUrl,
    displayName: displayName || 'Member',
    role,
    userId: user?.id ?? '',
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
  coverImageUrl,
  canEditAvatar,
}: {
  name: string
  avatarUrl: string | null
  phone?: string | null
  stats: StatSnapshot
  coverImageUrl?: string
  canEditAvatar?: boolean
}) => {
  const { set, resolvedTheme } = useThemeSetting()
  const isDark = resolvedTheme === 'dark'
  const themeLabel = isDark ? 'Dark' : 'Light'
  const phoneLabel = formatPhoneDisplay(phone) || 'Add phone'
  const coverSource = coverImageUrl ? { uri: coverImageUrl } : bannerMerch

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

  return (
    <Card
      bordered
      bw={1}
      boc="$black1"
      br="$5"
      borderStyle="solid"
      overflow="hidden"
    >
      <YStack position="relative">
        <YStack h={bannerHeight} w="100%" bg="$color3" position="relative" overflow="hidden">
          <Image source={coverSource} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        </YStack>
        <YStack
          position="absolute"
          top={bannerHeight - avatarSize / 2}
          left={avatarInset}
          zIndex={2}
          elevation={2}
          bg="$background"
          p="$1"
          br={999}
        >
          {avatarNode}
        </YStack>
      </YStack>
      <YStack px="$4" pt={contentTopPadding} pb="$4" gap="$3" bg="$background">
        <XStack ai="flex-start" jc="space-between" gap="$3">
          <YStack gap="$1">
            <XStack ai="center" gap="$1.5">
              <SizableText size="$6" fontWeight="700">
                {name}
              </SizableText>
              <ChevronDown size={16} color="$color10" />
            </XStack>
            <Paragraph theme="alt2" size="$2">
              {phoneLabel}
            </Paragraph>
          </YStack>
          <XStack ai="center" gap="$2">
            <Paragraph theme="alt2" size="$2">
              {themeLabel}
            </Paragraph>
            <Switch
              native
              size="$2"
              checked={isDark}
              onCheckedChange={(next) => set(next ? 'dark' : 'light')}
              backgroundColor={isDark ? BRAND_COLORS.primary : '$color5'}
              borderColor={isDark ? BRAND_COLORS.primary : '$color6'}
              borderWidth={1}
            >
              <Switch.Thumb animation="100ms" />
            </Switch>
          </XStack>
        </XStack>
        <XStack ai="center" gap="$4">
          <StatBlock label="Games" value={stats.games} />
          <YStack w={1} h={28} bg="$color4" />
          <StatBlock label="Wins" value={stats.wins} />
          <YStack w={1} h={28} bg="$color4" />
          <StatBlock label="Losses" value={stats.losses} />
        </XStack>
      </YStack>
    </Card>
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

const LogoutSection = ({ onLogout }: { onLogout: () => void }) => {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <Card bordered bw={1} boc="$black1" br="$5" p="$4" gap="$3">
      <Paragraph
        size="$2"
        color="$color10"
        textDecorationLine="underline"
        alignSelf="center"
        accessibilityRole="button"
        onPress={() => setConfirmOpen(true)}
        pressStyle={{ opacity: 0.6 }}
      >
        Log out
      </Paragraph>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            key="overlay"
            animation="medium"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            o={0.5}
            backgroundColor="$color5"
          />
          <AlertDialog.Content
            key="content"
            elevate
            animation="medium"
            enterStyle={{ opacity: 0, scale: 0.95 }}
            exitStyle={{ opacity: 0, scale: 0.95 }}
            backgroundColor="$color2"
            br="$4"
            p="$4"
            gap="$3"
          >
            <AlertDialog.Title fontWeight="700">Log out?</AlertDialog.Title>
            <AlertDialog.Description>
              You will need to sign in again to access your account.
            </AlertDialog.Description>
            <XStack gap="$3">
              <Button
                size="$3"
                br="$10"
                flex={1}
                variant="outlined"
                onPress={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="$3"
                br="$10"
                flex={1}
                theme="red"
                onPress={() => {
                  setConfirmOpen(false)
                  onLogout()
                }}
                pressStyle={{ opacity: 0.85 }}
              >
                Log out
              </Button>
            </XStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </Card>
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
  const summary = isLoading
    ? 'Dialing in your record…'
    : stats.games
    ? `Winning ${formatPercent(stats.winRate)} of ${stats.games} runs`
    : 'You have not played yet — join your first run.'

  return (
    <Card bordered bw={1} boc="$black1" br="$5" p="$4" gap="$3">
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
    <Card bordered bw={1} boc="$black1" br="$5" p="$4" gap="$3">
      <XStack ai="center" jc="space-between" flexWrap="wrap" gap="$2">
        <SizableText size="$5" fontWeight="600">
          Recent games
        </SizableText>
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
        <YStack gap="$3">
          {games.map((game) => (
            <HistoryGameCard key={game.id} game={game} />
          ))}
        </YStack>
      )}
    </Card>
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
    <Card bordered bw={1} boc="$black1" br="$5" p="$4" gap="$3" backgroundColor="$color2">
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
    gap="$1"
    ai="center"
    p="$2.5"
    br="$5"
    borderWidth={1}
    borderColor="$black1"
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
