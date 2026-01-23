import { useMemo, type ReactNode } from 'react'
import { StyleSheet, type ScrollViewProps } from 'react-native'
import { Alert } from 'react-native'

import { PenSquare, Trash2 } from '@tamagui/lucide-icons'

import {
  Avatar,
  Button,
  Card,
  FullscreenSpinner,
  Paragraph,
  ScrollView,
  SizableText,
  XStack,
  YStack,
  useToastController,
} from '@my/ui/public'
import { screenContentContainerStyle } from 'app/constants/layout'
import { useBrand } from 'app/provider/brand'
import { api } from 'app/utils/api'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { formatPhoneDisplay } from 'app/utils/phone'
import { formatProfileName } from 'app/utils/profileName'
import { useUser } from 'app/utils/useUser'
import { useAppRouter } from 'app/utils/useAppRouter'

type MemberProfile = {
  id: string
  avatar_url: string | null
  first_name: string | null
  last_name: string | null
  name: string | null
  email: string | null
  phone: string | null
  position: string | null
  jersey_number: number | null
  role: string | null
}

const buildMemberName = (profile: MemberProfile) => {
  return formatProfileName(profile, 'Member') ?? 'Member'
}

const buildMemberInitials = (profile: MemberProfile) => {
  const base = buildMemberName(profile)
  const parts = base.split(' ').filter(Boolean)
  const initials = parts.slice(0, 2).map((part) => part[0]).join('')
  return initials.toUpperCase() || 'M'
}

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const MemberListScreen = ({ scrollProps, headerSpacer, topInset }: ScrollHeaderProps = {}) => {
  const { primaryColor } = useBrand()
  const { isAdmin, isOwner, isLoading } = useUser()
  const { activeCommunityId } = useActiveCommunity()
  const toast = useToastController()
  const utils = api.useUtils()
  const router = useAppRouter()

  const membersQuery = api.members.list.useQuery(
    { communityId: activeCommunityId ?? '' },
    { enabled: isAdmin && !isLoading && Boolean(activeCommunityId) }
  )

  const removeMutation = api.members.remove.useMutation({
    onSuccess: async () => {
      if (activeCommunityId) {
        await Promise.all([
          utils.members.list.invalidate({ communityId: activeCommunityId }),
          utils.members.pending.invalidate({ communityId: activeCommunityId }),
          utils.members.pendingCount.invalidate({ communityId: activeCommunityId }),
        ])
      }
      toast.show('Member removed')
    },
    onError: (error) => {
      toast.show('Unable to remove member', { message: error.message })
    },
  })

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data])

  if (isLoading) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (!isAdmin) {
    return (
      <YStack f={1} ai="center" jc="center" px="$6" gap="$2" pt={topInset ?? 0}>
        <SizableText size="$6" fontWeight="700">
          Admin access only
        </SizableText>
        <Paragraph theme="alt2" textAlign="center">
          Talk to a club steward if you need approval access.
        </Paragraph>
      </YStack>
    )
  }

  if (membersQuery.isLoading) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const baseContentStyle = {
    ...screenContentContainerStyle,
    paddingTop: headerSpacer ? 0 : screenContentContainerStyle.paddingTop,
    flexGrow: 1,
  }
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
  )

  const handleRemove = (member: MemberProfile) => {
    const displayName = buildMemberName(member)
    Alert.alert(
      'Remove member',
      `Are you sure you want to remove ${displayName} from the community? They will need approval to rejoin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (!activeCommunityId) return
            removeMutation.mutate({ communityId: activeCommunityId, profileId: member.id })
          },
        },
      ]
    )
  }

  const formatRoleLabel = (role: string | null) => {
    if (role === 'owner') return 'Owner'
    if (role === 'admin') return 'Admin'
    return 'Member'
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      {...scrollViewProps}
      contentContainerStyle={mergedContentStyle}
    >
      {headerSpacer}
      <YStack maw={900} mx="auto" w="100%" space="$4" py="$4">
        <YStack gap="$2">
          <SizableText size="$6" fontWeight="700">
            Members
          </SizableText>
          <Paragraph theme="alt2">Manage active members and update their profiles.</Paragraph>
          <YStack h={2} w={56} br={999} bg={primaryColor} />
        </YStack>
        {membersQuery.isError ? (
          <Card bordered $platform-native={{ borderWidth: 0 }} p="$4">
            <Paragraph theme="alt2">Unable to load members.</Paragraph>
            <Button
              mt="$3"
              onPress={() => membersQuery.refetch()}
              disabled={membersQuery.isFetching}
            >
              {membersQuery.isFetching ? 'Refreshing...' : 'Retry'}
            </Button>
          </Card>
        ) : members.length === 0 ? (
          <Card bordered $platform-native={{ borderWidth: 0 }} p="$4">
            <Paragraph theme="alt2">No approved members yet.</Paragraph>
          </Card>
        ) : (
          <YStack gap="$2">
            {members.map((member) => {
              const displayName = buildMemberName(member)
              const initials = buildMemberInitials(member)
              const phoneLabel = formatPhoneDisplay(member.phone)
              const roleLabel = formatRoleLabel(member.role)
              const detailLine = [roleLabel, phoneLabel].filter(Boolean).join(' · ')
              const canRemove = isOwner
              return (
                <Card key={member.id} bordered bw={1} boc="$color12" p="$4" gap="$3">
                  <XStack ai="center" jc="space-between" gap="$3" flexWrap="wrap">
                    <XStack ai="center" gap="$3" flex={1} minWidth={220}>
                      <Avatar circular size="$3" bg="$color3">
                        {member.avatar_url ? (
                          <Avatar.Image
                            source={{
                              uri: member.avatar_url,
                              width: 48,
                              height: 48,
                            }}
                          />
                        ) : (
                          <YStack f={1} ai="center" jc="center">
                            <SizableText size="$3" fontWeight="700">
                              {initials}
                            </SizableText>
                          </YStack>
                        )}
                      </Avatar>
                      <YStack gap="$0.5" flex={1} minWidth={0}>
                        <SizableText size="$5" fontWeight="600">
                          {displayName}
                        </SizableText>
                        {detailLine ? (
                          <Paragraph theme="alt2" size="$2">
                            {detailLine}
                          </Paragraph>
                        ) : null}
                      </YStack>
                    </XStack>
                    <XStack gap="$1.5">
                      <Button
                        chromeless
                        size="$3"
                        icon={PenSquare}
                        aria-label="Edit profile"
                        onPress={() => router.push(`/admin/approvals/${member.id}`)}
                        disabled={removeMutation.isPending}
                        pressStyle={{ opacity: 0.7 }}
                      />
                      {canRemove ? (
                        <Button
                          chromeless
                          size="$3"
                          icon={Trash2}
                          theme="red"
                          aria-label="Remove member"
                          onPress={() => handleRemove(member)}
                          disabled={removeMutation.isPending}
                          pressStyle={{ opacity: 0.7 }}
                        />
                      ) : null}
                    </XStack>
                  </XStack>
                </Card>
              )
            })}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  )
}
