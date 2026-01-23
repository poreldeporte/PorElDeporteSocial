import { useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, type ScrollViewProps } from 'react-native'

import { Search } from '@tamagui/lucide-icons'
import { LinearGradient } from 'tamagui/linear-gradient'

import {
  Avatar,
  Button,
  Card,
  FullscreenSpinner,
  Input,
  Paragraph,
  ScrollView,
  SizableText,
  XStack,
  YStack,
  useToastController,
} from '@my/ui/public'

import { useBrand } from 'app/provider/brand'
import { useThemeSetting } from 'app/provider/theme'
import { api } from 'app/utils/api'
import { resolveBrandColor } from 'app/utils/brand'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useUser } from 'app/utils/useUser'
import { useAppRouter } from 'app/utils/useAppRouter'

const normalizeName = (value: string | null | undefined) => value?.trim() || 'Community'

const buildInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean)
  if (!parts.length) return 'C'
  const initials = parts.slice(0, 2).map((part) => part[0]).join('')
  return initials.toUpperCase()
}

const getContrastColor = (color: string) => {
  const hex = color.replace('#', '')
  if (hex.length !== 6) return '#FFFFFF'
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 160 ? '#0B0B0B' : '#FFFFFF'
}

const formatCityState = (city?: string | null, state?: string | null) => {
  const safeCity = city?.trim()
  const safeState = state?.trim()
  if (safeCity && safeState) return `${safeCity}, ${safeState}`
  return safeCity || safeState || null
}

const formatSports = (sports?: string[] | null, sport?: string | null) => {
  if (sports?.length) return sports.join(' · ')
  const fallback = sport?.trim()
  return fallback || null
}

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const JoinCommunitiesScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const toast = useToastController()
  const { primaryColor } = useBrand()
  const { resolvedTheme } = useThemeSetting()
  const isDark = resolvedTheme === 'dark'
  const { profile } = useUser()
  const {
    memberships,
    pendingMemberships,
    pendingRoute,
    refresh,
    setActiveCommunityId,
    setFavoriteCommunityId,
  } = useActiveCommunity()
  const router = useAppRouter()
  const [search, setSearch] = useState('')
  const [pendingRequestIds, setPendingRequestIds] = useState<string[]>([])

  const communitiesQuery = api.community.listPublic.useQuery()

  const requestMutation = api.members.request.useMutation({
    onSuccess: async () => {
      toast.show('Request sent')
      await refresh()
    },
    onError: (error) => {
      toast.show('Unable to request access', { message: error.message })
    },
  })

  const membershipMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof formatMembershipStatus>>()
    memberships.forEach((membership) => {
      map.set(membership.communityId, formatMembershipStatus(membership.status))
    })
    return map
  }, [memberships])

  const normalizedSearch = search.trim().toLowerCase()
  const communities = useMemo(() => {
    const rows = communitiesQuery.data ?? []
    const filtered = normalizedSearch
      ? rows.filter((community) => normalizeName(community.name).toLowerCase().includes(normalizedSearch))
      : rows
    return [...filtered].sort((a, b) => normalizeName(a.name).localeCompare(normalizeName(b.name)))
  }, [communitiesQuery.data, normalizedSearch])

  const pendingBannerVisible = pendingMemberships.length > 0 || Boolean(pendingRoute)
  const pendingBannerTitle = pendingMemberships.length > 0 ? 'You’re in review.' : 'Approval required.'
  const pendingBannerBody =
    pendingMemberships.length > 0
      ? 'We’ll notify you when you’re approved.'
      : 'This community requires approval before you can enter.'

  const createdCommunityId =
    (profile as { created_community_id?: string | null } | null)?.created_community_id ?? null
  const createdMembership = createdCommunityId
    ? memberships.find((membership) => membership.communityId === createdCommunityId) ?? null
    : null
  const createdCommunity = createdMembership?.community ?? null
  const createdApproved = createdMembership?.status === 'approved'
  const createdArchived = Boolean(createdCommunity?.archivedAt)
  const startCardTitle = createdCommunityId
    ? createdArchived
      ? 'Archived community'
      : 'My community'
    : 'Start a community'
  const startCardDescription = createdCommunityId
    ? 'You can only create 1 community.'
    : 'Create your own group in minutes.'
  const startButtonDisabled = Boolean(createdCommunityId && !createdApproved)
  const startButtonLabel = createdCommunityId
    ? createdApproved
      ? startCardTitle
      : 'You already created a community'
    : 'Start a community'
  const startButtonBg = startButtonDisabled ? '$color2' : primaryColor
  const startButtonBorder = startButtonDisabled ? '$color4' : primaryColor
  const startButtonText = startButtonDisabled ? '$color11' : '$background'
  const resultsLabel = normalizedSearch
    ? `${communities.length} ${communities.length === 1 ? 'match' : 'matches'}`
    : `${communities.length} ${communities.length === 1 ? 'community' : 'communities'}`
  const emptyMessage = normalizedSearch ? 'No matches found.' : 'No communities available yet.'

  const requestAccess = async (communityId: string) => {
    setPendingRequestIds((prev) =>
      prev.includes(communityId) ? prev : [...prev, communityId]
    )
    try {
      await requestMutation.mutateAsync({ communityId })
    } catch (_error) {
      // handled by mutation callbacks
    } finally {
      setPendingRequestIds((prev) => prev.filter((id) => id !== communityId))
    }
  }

  if (communitiesQuery.isLoading) {
    return (
      <YStack f={1} ai="center" jc="center">
        <FullscreenSpinner />
      </YStack>
    )
  }

  return (
    <YStack f={1} position="relative" bg="$color1">
      <LinearGradient
        colors={
          isDark
            ? ['rgba(255,120,48,0.22)', 'rgba(6,10,16,0.92)']
            : ['rgba(255,120,48,0.18)', 'rgba(255,255,255,0.96)']
        }
        start={[0, 0]}
        end={[1, 1]}
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        pointerEvents="none"
      />
      <ScrollView
        style={{ flex: 1 }}
        {...(scrollProps ?? {})}
        contentContainerStyle={StyleSheet.flatten([
          {
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingBottom: 32,
            paddingTop: headerSpacer ? 0 : 24,
          },
          scrollProps?.contentContainerStyle,
        ])}
      >
        {headerSpacer}
        <YStack gap="$4">
          <YStack gap="$1.5">
            <SizableText size="$7" fontWeight="700">
              Join communities
            </SizableText>
            <Paragraph theme="alt2">Find your people and request access.</Paragraph>
            <YStack h={2} w={56} br={999} bg={primaryColor} />
          </YStack>

          <Card bordered bw={1} boc="$color12" br="$6" overflow="hidden" bg="$background">
            <XStack>
              <YStack w={6} bg={primaryColor} opacity={0.9} />
              <YStack flex={1} px="$3.5" py="$3.5" gap="$2">
                <SizableText size="$5" fontWeight="600">
                  {startCardTitle}
                </SizableText>
                <Paragraph theme="alt2" size="$2">
                  {startCardDescription}
                </Paragraph>
                <Button
                  onPress={() => {
                    if (createdCommunityId) {
                      if (!createdApproved) return
                      setActiveCommunityId(createdCommunityId)
                      void setFavoriteCommunityId(createdCommunityId)
                      router.replace(createdArchived ? '/settings/community' : '/')
                      return
                    }
                    router.push('/communities/create')
                  }}
                  disabled={startButtonDisabled}
                  height={48}
                  borderRadius={999}
                  fontSize={15}
                  fontWeight="600"
                  pressStyle={{ opacity: 0.85 }}
                  backgroundColor={startButtonBg}
                  borderColor={startButtonBorder}
                  borderWidth={1}
                  color={startButtonText}
                >
                  {startButtonLabel}
                </Button>
              </YStack>
            </XStack>
          </Card>

          {pendingBannerVisible ? (
            <Card bordered bw={1} boc="$color12" br="$6" overflow="hidden" bg="$background">
              <XStack>
                <YStack w={6} bg="$color8" />
                <YStack flex={1} px="$3.5" py="$3.5" gap="$1.5">
                  <SizableText size="$5" fontWeight="600">
                    {pendingBannerTitle}
                  </SizableText>
                  <Paragraph theme="alt2">{pendingBannerBody}</Paragraph>
                </YStack>
              </XStack>
            </Card>
          ) : null}

          <YStack gap="$2">
            <XStack
              ai="center"
              gap="$2"
              px="$3"
              py="$2"
              br="$6"
              bg="$background"
              borderColor="$color12"
              borderWidth={1}
            >
              <Search size={18} color="$color10" />
              <Input
                flex={1}
                value={search}
                onChangeText={setSearch}
                placeholder="Search communities"
                autoCapitalize="none"
                placeholderTextColor="$color10"
                autoCorrect={false}
                inputMode="search"
                borderRadius={0}
                borderWidth={0}
                paddingHorizontal={0}
                backgroundColor="transparent"
                color="$color"
              />
            </XStack>
            <Paragraph theme="alt2" size="$2">
              {resultsLabel} · A–Z
            </Paragraph>
          </YStack>

          {communitiesQuery.isError ? (
            <Card bordered p="$4" gap="$2">
              <Paragraph theme="alt2">Unable to load communities.</Paragraph>
              <Button
                onPress={() => communitiesQuery.refetch()}
                disabled={communitiesQuery.isFetching}
              >
                {communitiesQuery.isFetching ? 'Refreshing…' : 'Retry'}
              </Button>
            </Card>
          ) : communities.length === 0 ? (
            <Card bordered p="$4">
              <Paragraph theme="alt2">{emptyMessage}</Paragraph>
            </Card>
          ) : (
            <YStack gap="$3">
              {communities.map((community) => {
                const membershipStatus = membershipMap.get(community.id) ?? 'not_requested'
                const label = normalizeName(community.name)
                const accent = resolveBrandColor(community.community_primary_color ?? null)
                const logoUrl = community.community_logo_url?.trim() || null
                const isRequesting = pendingRequestIds.includes(community.id)
                const disabled =
                  membershipStatus === 'pending' || membershipStatus === 'approved' || isRequesting
                const memberCount = community.memberCount ?? 0
                const memberLabel = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`
                const locationLine = [
                  formatCityState(community.city, community.state),
                  formatSports(community.sports, community.sport),
                ]
                  .filter(Boolean)
                  .join(' • ')
                const metaLine = [memberLabel, locationLine].filter(Boolean).join(' • ')
                const actionLabel = isRequesting
                  ? 'Requesting…'
                  : membershipStatus === 'approved'
                    ? 'Member'
                    : membershipStatus === 'pending'
                      ? 'Pending'
                      : membershipStatus === 'rejected'
                        ? 'Request again'
                        : 'Request access'
                const statusLabel =
                  membershipStatus === 'approved'
                    ? 'Member'
                    : membershipStatus === 'pending'
                      ? 'Pending'
                      : membershipStatus === 'rejected'
                        ? 'Rejected'
                        : null
                const statusTone = membershipStatus === 'approved' ? 'active' : membershipStatus

                return (
                  <Card
                    key={community.id}
                    bordered
                    bw={1}
                    boc="$color12"
                    br="$6"
                    overflow="hidden"
                    bg="$background"
                  >
                    <XStack>
                      <YStack w={6} bg={accent} opacity={0.9} />
                      <YStack flex={1} px="$3.5" py="$3.5" gap="$3">
                        <XStack gap="$3" ai="center">
                          <Avatar circular size="$4" bg="$color3">
                            {logoUrl ? (
                              <Avatar.Image source={{ uri: logoUrl, width: 64, height: 64 }} />
                            ) : (
                              <YStack f={1} ai="center" jc="center">
                                <SizableText fontWeight="700">{buildInitials(label)}</SizableText>
                              </YStack>
                            )}
                          </Avatar>
                          <YStack flex={1} gap="$1">
                            <XStack ai="center" gap="$2" flexWrap="wrap">
                              <SizableText size="$5" fontWeight="600">
                                {label}
                              </SizableText>
                              {statusLabel ? (
                                <StatusPill label={statusLabel} tone={statusTone} accent={accent} />
                              ) : null}
                            </XStack>
                            {metaLine ? (
                              <Paragraph theme="alt2" size="$2">
                                {metaLine}
                              </Paragraph>
                            ) : null}
                          </YStack>
                        </XStack>
                        <Button
                          size="$3"
                          disabled={disabled}
                          onPress={() => {
                            if (disabled) return
                            void requestAccess(community.id)
                          }}
                          height={48}
                          borderRadius={999}
                          fontSize={15}
                          fontWeight="600"
                          pressStyle={{ opacity: 0.85 }}
                          backgroundColor={disabled ? '$color2' : accent}
                          borderColor={disabled ? '$color4' : accent}
                          borderWidth={1}
                          color={disabled ? '$color11' : '$background'}
                        >
                          {actionLabel}
                        </Button>
                      </YStack>
                    </XStack>
                  </Card>
                )
              })}
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

const formatMembershipStatus = (status: string | null | undefined) => {
  if (status === 'approved') return 'approved'
  if (status === 'pending') return 'pending'
  if (status === 'rejected') return 'rejected'
  return 'not_requested'
}

const StatusPill = ({
  label,
  tone,
  accent,
}: {
  label: string
  tone: 'pending' | 'rejected' | 'approved' | 'active' | string | null | undefined
  accent: string
}) => {
  if (!label) return null
  const isActive = tone === 'active'
  const style = (() => {
    if (isActive) {
      return { bg: accent, text: getContrastColor(accent), border: accent }
    }
    if (tone === 'pending') {
      return { bg: 'rgba(245,166,35,0.18)', text: '#C27803', border: 'rgba(245,166,35,0.4)' }
    }
    if (tone === 'rejected') {
      return { bg: 'rgba(235,87,87,0.18)', text: '#C0392B', border: 'rgba(235,87,87,0.35)' }
    }
    return { bg: 'rgba(255,255,255,0.7)', text: '#3B3B3B', border: 'rgba(0,0,0,0.1)' }
  })()

  return (
    <YStack
      px="$2"
      py="$0.5"
      br="$10"
      backgroundColor={style.bg}
      borderWidth={1}
      borderColor={style.border}
    >
      <SizableText size="$1" fontWeight="700" color={style.text}>
        {label}
      </SizableText>
    </YStack>
  )
}
