import { Alert, StyleSheet, type ScrollViewProps } from 'react-native'
import { useCallback, useMemo, useState, type ReactNode } from 'react'

import {
  Button,
  Card,
  FullscreenSpinner,
  Paragraph,
  Popover,
  ScrollView,
  Separator,
  SizableText,
  XStack,
  YStack,
  useToastController,
} from '@my/ui/public'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, MoreHorizontal, PenSquare, X } from '@tamagui/lucide-icons'
import { BrandStamp } from 'app/components/BrandStamp'
import { screenContentContainerStyle } from 'app/constants/layout'
import { useBrand } from 'app/provider/brand'
import { formatProfileName } from 'app/utils/profileName'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import { formatPhoneDisplay } from 'app/utils/phone'
import { useRouter } from 'solito/router'

import { useMemberApprovalsRealtime } from './member-approvals-realtime'

type PendingProfile = {
  id: string
  first_name: string | null
  last_name: string | null
  name: string | null
  email: string | null
  phone: string | null
  position: string | null
  jersey_number: number | null
  birth_date: string | null
}

const buildMemberName = (profile: PendingProfile) => {
  return formatProfileName(profile, 'New member') ?? 'New member'
}

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const MemberApprovalsScreen = ({
  scrollProps,
  headerSpacer,
  topInset,
}: ScrollHeaderProps = {}) => {
  const { primaryColor } = useBrand()
  const { isAdmin, isLoading } = useUser()
  const supabase = useSupabase()
  const toast = useToastController()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const realtimeEnabled = isAdmin && !isLoading
  const scheduleInvalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['member-approvals', 'pending'] })
  }, [queryClient])
  useMemberApprovalsRealtime(realtimeEnabled, scheduleInvalidate)

  const pendingQuery = useQuery({
    queryKey: ['member-approvals', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, first_name, last_name, email, phone, position, jersey_number, birth_date')
        .eq('approval_status', 'pending')
        .not('first_name', 'is', null)
        .not('last_name', 'is', null)
        .not('email', 'is', null)
        .not('position', 'is', null)
        .not('jersey_number', 'is', null)
        .not('birth_date', 'is', null)
        .neq('first_name', '')
        .neq('last_name', '')
        .neq('email', '')
        .neq('position', '')
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: isAdmin && !isLoading,
  })

  const approveMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ approval_status: 'approved' })
        .eq('id', profileId)
        .select('id')
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data?.id) throw new Error('Unable to approve member.')
    },
    onMutate: (profileId) => {
      setApprovingId(profileId)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['member-approvals', 'pending'] }),
        queryClient.invalidateQueries({ queryKey: ['member-approvals', 'pending-count'] }),
      ])
      toast.show('Member approved')
    },
    onError: (error: Error) => {
      toast.show('Unable to approve member', { message: error.message })
    },
    onSettled: () => {
      setApprovingId(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ approval_status: 'rejected' })
        .eq('id', profileId)
        .select('id')
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data?.id) throw new Error('Unable to reject member.')
    },
    onMutate: (profileId) => {
      setRejectingId(profileId)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['member-approvals', 'pending'] }),
        queryClient.invalidateQueries({ queryKey: ['member-approvals', 'pending-count'] }),
      ])
      toast.show('Application rejected')
    },
    onError: (error: Error) => {
      toast.show('Unable to reject member', { message: error.message })
    },
    onSettled: () => {
      setRejectingId(null)
    },
  })

  const pendingMembers = useMemo(() => pendingQuery.data ?? [], [pendingQuery.data])

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

  if (pendingQuery.isLoading) {
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
            Applications
          </SizableText>
          <Paragraph theme="alt2">Review profiles and approve access when the details look right.</Paragraph>
          <YStack h={2} w={56} br={999} bg={primaryColor} />
        </YStack>
        {pendingQuery.isError ? (
          <Card bordered bw={1} boc="$color12" br="$5" p="$4">
            <Paragraph theme="alt2">Unable to load pending members.</Paragraph>
            <Button
              mt="$3"
              onPress={() => pendingQuery.refetch()}
              disabled={pendingQuery.isFetching}
            >
              {pendingQuery.isFetching ? 'Refreshing...' : 'Retry'}
            </Button>
          </Card>
        ) : pendingMembers.length === 0 ? (
          <Card bordered bw={1} boc="$color12" br="$5" p="$4">
            <Paragraph theme="alt2">No pending members right now.</Paragraph>
          </Card>
        ) : (
          <YStack gap="$2">
            {pendingMembers.map((member: PendingProfile) => {
              const displayName = buildMemberName(member)
              const isApproving = approvingId === member.id && approveMutation.isPending
              const isRejecting = rejectingId === member.id && rejectMutation.isPending
              const actionsDisabled = approveMutation.isPending || rejectMutation.isPending
              const menuOpen = openMenuId === member.id
              const closeMenu = () => setOpenMenuId(null)
              const handleReject = () => {
                if (rejectMutation.isPending) return
                Alert.alert(
                  'Reject application?',
                  `${displayName} can reapply after updating their profile.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reject',
                      style: 'destructive',
                      onPress: () => rejectMutation.mutate(member.id),
                    },
                  ]
                )
              }
              return (
                <Card
                  key={member.id}
                  bordered
                  bw={1}
                  boc="$color12"
                  br="$5"
                  p="$4"
                  gap="$3"
                >
                  <XStack ai="center" jc="space-between" gap="$2">
                    <SizableText size="$5" fontWeight="600" flex={1} minWidth={0}>
                      {displayName}
                    </SizableText>
                    <Popover
                      open={menuOpen}
                      onOpenChange={(open) => setOpenMenuId(open ? member.id : null)}
                      allowFlip
                      stayInFrame={{ padding: 8 }}
                    >
                      <Popover.Trigger asChild>
                        <Button
                          size="$2"
                          circular
                          icon={MoreHorizontal}
                          backgroundColor="$color2"
                          borderWidth={1}
                          borderColor="$color5"
                          pressStyle={{ backgroundColor: '$color3' }}
                          hoverStyle={{ backgroundColor: '$color3' }}
                          aria-label="Member actions"
                          disabled={actionsDisabled}
                        />
                      </Popover.Trigger>
                      <Popover.Content
                        side="bottom"
                        align="end"
                        sideOffset={4}
                        bw={1}
                        boc="$borderColor"
                        br="$4"
                        p="$2"
                        bg="$background"
                        minWidth={180}
                        enterStyle={{ y: -6, o: 0 }}
                        exitStyle={{ y: -6, o: 0 }}
                        elevate
                        themeInverse
                      >
                        <Popover.Arrow bw={1} boc="$borderColor" bg="$background" />
                        <YStack gap="$1">
                          <Button
                            chromeless
                            justifyContent="flex-start"
                            space="$2"
                            size="$4"
                            px="$3"
                            icon={PenSquare}
                            onPress={() => {
                              closeMenu()
                              router.push(`/admin/approvals/${member.id}`)
                            }}
                            disabled={actionsDisabled}
                          >
                            Review
                          </Button>
                          <Separator />
                          <Button
                            chromeless
                            justifyContent="flex-start"
                            space="$2"
                            size="$4"
                            px="$3"
                            icon={CheckCircle2}
                            onPress={() => {
                              closeMenu()
                              approveMutation.mutate(member.id)
                            }}
                            disabled={actionsDisabled}
                          >
                            {isApproving ? 'Approving...' : 'Approve'}
                          </Button>
                          <Separator />
                          <Button
                            chromeless
                            justifyContent="flex-start"
                            theme="red"
                            space="$2"
                            size="$4"
                            px="$3"
                            icon={X}
                            onPress={() => {
                              closeMenu()
                              handleReject()
                            }}
                            disabled={actionsDisabled}
                          >
                            {isRejecting ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </YStack>
                      </Popover.Content>
                    </Popover>
                  </XStack>
                  <YStack gap="$2">
                    {member.email ? (
                      <Paragraph theme="alt2" size="$2">
                        Email: {member.email}
                      </Paragraph>
                    ) : null}
                    {member.phone ? (
                      <Paragraph theme="alt2" size="$2">
                        Phone: {formatPhoneDisplay(member.phone) || member.phone}
                      </Paragraph>
                    ) : null}
                    {member.position ? (
                      <Paragraph theme="alt2" size="$2">
                        Position: {member.position}
                      </Paragraph>
                    ) : null}
                    {member.jersey_number ? (
                      <Paragraph theme="alt2" size="$2">
                        Jersey: {member.jersey_number}
                      </Paragraph>
                    ) : null}
                    {member.birth_date ? (
                      <Paragraph theme="alt2" size="$2">
                        Birth date: {member.birth_date}
                      </Paragraph>
                    ) : null}
                  </YStack>
                </Card>
              )
            })}
          </YStack>
        )}
        <BrandStamp />
      </YStack>
    </ScrollView>
  )
}
