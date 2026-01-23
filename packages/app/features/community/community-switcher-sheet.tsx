import { useEffect, useMemo, useState } from 'react'

import { HelpCircle, Star, Users } from '@tamagui/lucide-icons'
import {
  Avatar,
  Button,
  Card,
  Paragraph,
  Sheet,
  Separator,
  SizableText,
  XStack,
  YStack,
} from '@my/ui/public'
import { brandIcon } from 'app/assets'
import { InfoPopup } from 'app/components/InfoPopup'
import { useBrand } from 'app/provider/brand'
import { resolveBrandColor } from 'app/utils/brand'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useAppRouter } from 'app/utils/useAppRouter'

const normalizeName = (value: string | null | undefined) => value?.trim() || 'Community'

const buildInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean)
  if (!parts.length) return 'C'
  const initials = parts.slice(0, 2).map((part) => part[0]).join('')
  return initials.toUpperCase()
}

const formatRoleLabel = (role: string | null | undefined) => {
  if (role === 'owner') return 'Owner'
  if (role === 'admin') return 'Admin'
  return 'Member'
}

const formatStatusLabel = (status: string | null | undefined) => {
  if (status === 'pending') return 'Pending'
  if (status === 'rejected') return 'Rejected'
  return 'Approved'
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

const getContrastColor = (color: string) => {
  const hex = resolveBrandColor(color).replace('#', '')
  if (hex.length !== 6) return '#FFFFFF'
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 160 ? '#0B0B0B' : '#FFFFFF'
}

type CommunitySwitcherSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CommunitySwitcherSheet = ({ open, onOpenChange }: CommunitySwitcherSheetProps) => {
  const router = useAppRouter()
  const { primaryColor } = useBrand()
  const {
    memberships,
    activeCommunityId,
    activeCommunity,
    favoriteCommunityId,
    setActiveCommunityId,
    setFavoriteCommunityId,
  } = useActiveCommunity()
  const [infoOpen, setInfoOpen] = useState(false)
  const [pendingRoute, setPendingRoute] = useState<string | null>(null)
  const entries = useMemo(() => {
    return [...memberships]
      .map((membership) => {
        const community = membership.community
        return {
          id: membership.communityId,
          name: normalizeName(community?.name),
          city: community?.city ?? null,
          state: community?.state ?? null,
          sport: community?.sport ?? null,
          sports: community?.sports ?? null,
          logoUrl: community?.logoUrl ?? null,
          primaryColor: community?.primaryColor ?? null,
          memberCount: community?.memberCount ?? null,
          role: membership.role,
          status: membership.status,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [memberships])

  const otherEntries = useMemo(
    () => entries.filter((entry) => entry.id !== activeCommunityId),
    [entries, activeCommunityId]
  )

  const activeName = normalizeName(activeCommunity?.name)
  const activeLogoUrl = activeCommunity?.logoUrl ?? null
  const activeEntry = entries.find((entry) => entry.id === activeCommunityId) ?? null
  const heroColor = resolveBrandColor(activeEntry?.primaryColor ?? primaryColor)
  const heroText = getContrastColor(heroColor)
  const heroMuted =
    heroText === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
  const activeLocation = [
    formatCityState(activeEntry?.city, activeEntry?.state),
    formatSports(activeEntry?.sports, activeEntry?.sport),
  ]
    .filter(Boolean)
    .join(' · ')
  const activeMemberCount = activeEntry?.memberCount ? `${activeEntry.memberCount} members` : null
  const activeRole = activeEntry ? formatRoleLabel(activeEntry.role) : null
  const activeMeta = activeLocation || [activeMemberCount, activeRole].filter(Boolean).join(' · ')

  useEffect(() => {
    if (!pendingRoute || open) return
    router.push(pendingRoute)
    setPendingRoute(null)
  }, [open, pendingRoute, router])

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      modal
      snapPoints={[70]}
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
      <Sheet.Frame
        backgroundColor="$background"
        borderColor="$color12"
        borderWidth={1}
        position="relative"
      >
        <Sheet.ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <YStack px="$4" pt="$4" gap="$4">
            <YStack gap="$1">
              <XStack ai="center" jc="space-between" gap="$2">
                <SizableText size="$6" fontWeight="700">
                  Switch communities
                </SizableText>
                <Button
                  chromeless
                  size="$2"
                  p="$1"
                  onPress={() => setInfoOpen(true)}
                  aria-label="About communities"
                  pressStyle={{ opacity: 0.7 }}
                >
                  <Button.Icon>
                    <HelpCircle size={20} color="$color10" />
                  </Button.Icon>
                </Button>
              </XStack>
              <Paragraph theme="alt2">Choose where you want to play right now.</Paragraph>
            </YStack>

            <YStack br="$7" overflow="hidden" backgroundColor={heroColor}>
              <YStack px="$4" py="$4" gap="$2">
                <XStack ai="center" gap="$3">
                  <Avatar circular size="$5" bg="rgba(255,255,255,0.2)">
                    {activeLogoUrl ? (
                      <Avatar.Image source={{ uri: activeLogoUrl, width: 72, height: 72 }} />
                    ) : (
                      <YStack f={1} ai="center" jc="center">
                        <SizableText fontWeight="700" color={heroText}>
                          {buildInitials(activeName)}
                        </SizableText>
                      </YStack>
                    )}
                  </Avatar>
                  <YStack flex={1} gap="$0.5">
                    <SizableText size="$6" fontWeight="700" color={heroText}>
                      {activeName}
                    </SizableText>
                    {activeMeta ? (
                      <Paragraph size="$2" color={heroMuted}>
                        {activeMeta}
                      </Paragraph>
                    ) : null}
                  </YStack>
                  <StatusPill label="Current" tone="active" accent={heroText === '#FFFFFF' ? heroColor : '#0B0B0B'} />
                </XStack>
              </YStack>
            </YStack>

            <YStack gap="$2">
              <Separator />
              <XStack ai="center" jc="space-between" gap="$2">
                <SizableText size="$3" fontWeight="700">
                  Other
                </SizableText>
                <Button
                  chromeless
                  size="$2"
                  onPress={() => {
                    setPendingRoute('/communities/join')
                    onOpenChange(false)
                  }}
                  pressStyle={{ opacity: 0.7 }}
                >
                  + Join
                </Button>
              </XStack>
              {otherEntries.map((entry) => {
                const isApproved = entry.status === 'approved'
                const isActive = entry.id === activeCommunityId
                const isFavorite = isApproved && entry.id === favoriteCommunityId
                const roleLabel = formatRoleLabel(entry.role)
                const statusLabel = formatStatusLabel(entry.status)
                const accent = resolveBrandColor(entry.primaryColor)
                const disabled = !isApproved
                const memberLabel = entry.memberCount ? `${entry.memberCount} members` : null
                const locationLine = [
                  formatCityState(entry.city, entry.state),
                  formatSports(entry.sports, entry.sport),
                ]
                  .filter(Boolean)
                  .join(' · ')
                const metaLine = locationLine || [memberLabel, roleLabel].filter(Boolean).join(' · ') || statusLabel

                const logoSource = entry.logoUrl
                  ? { uri: entry.logoUrl, width: 64, height: 64 }
                  : brandIcon

                return (
                  <Card
                    key={entry.id}
                    bordered
                    p={0}
                    overflow="hidden"
                    backgroundColor={isActive ? '$color2' : '$color1'}
                    opacity={disabled ? 0.7 : 1}
                    cursor={disabled ? 'not-allowed' : 'pointer'}
                    pressStyle={{ opacity: disabled ? 0.7 : 0.9 }}
                    onPress={() => {
                      if (disabled) return
                      setActiveCommunityId(entry.id)
                      onOpenChange(false)
                    }}
                  >
                    <XStack>
                      <YStack w={6} bg={accent} opacity={disabled ? 0.4 : 1} />
                      <XStack flex={1} px="$3" py="$3" ai="center" gap="$3">
                        <Avatar circular size="$4" bg="$color3">
                          <Avatar.Image source={logoSource} />
                        </Avatar>
                        <YStack flex={1} gap="$0.5">
                          <SizableText size="$5" fontWeight="600">
                            {entry.name}
                          </SizableText>
                          {metaLine ? (
                            <Paragraph theme="alt2" size="$2">
                              {metaLine}
                            </Paragraph>
                          ) : null}
                        </YStack>
                        <YStack ai="flex-end" gap="$1">
                          {isApproved ? (
                            <Button
                              size="$2"
                              chromeless
                              aria-label="Set favorite"
                              onPress={() => setFavoriteCommunityId(entry.id)}
                              pressStyle={{ opacity: 0.7 }}
                            >
                              <Star
                                size={18}
                                color={isFavorite ? accent : '$color10'}
                                fill={isFavorite ? accent : 'transparent'}
                              />
                            </Button>
                          ) : null}
                          {!isApproved ? (
                            <StatusPill label={statusLabel} tone={entry.status} accent={accent} />
                          ) : isActive ? (
                            <StatusPill label="Current" tone="active" accent={accent} />
                          ) : null}
                        </YStack>
                      </XStack>
                    </XStack>
                  </Card>
                )
              })}
              {otherEntries.length === 0 ? (
                <OtherCommunitiesEmptyState primaryColor={primaryColor} />
              ) : null}
            </YStack>

          </YStack>
        </Sheet.ScrollView>
      </Sheet.Frame>
      <InfoPopup
        open={infoOpen}
        onOpenChange={setInfoOpen}
        title="Communities"
        description="Each community is its own league. Your games, stats, and approvals live inside one at a time."
        bullets={[
          'Approval is required before you can enter.',
          'Pending communities show in the list but can’t be selected yet.',
          'Set a favorite to make it your default.',
        ]}
        footer="Switching communities updates the entire app view."
      />
    </Sheet>
  )
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
      return { bg: accent, text: '#FFFFFF', border: accent }
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

const OtherCommunitiesEmptyState = ({ primaryColor }: { primaryColor: string }) => {
  return (
    <YStack ai="center" jc="center" py="$4" position="relative" overflow="hidden">
      <YStack position="absolute" top={0} left={0} right={0} bottom={0} opacity={0.2} gap="$3">
        {[0, 1].map((row) => (
          <YStack
            key={`ghost-community-${row}`}
            h={68}
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
        maxWidth={300}
        width="100%"
      >
        <YStack w={64} h={64} br={999} bg="$color2" ai="center" jc="center">
          <Users size={28} color={primaryColor} />
        </YStack>
        <SizableText
          size="$3"
          fontWeight="700"
          textTransform="uppercase"
          letterSpacing={1.2}
          textAlign="center"
        >
          Grow your network
        </SizableText>
        <Paragraph theme="alt2" textAlign="center">
          Request access or create a community.
        </Paragraph>
      </Card>
    </YStack>
  )
}
