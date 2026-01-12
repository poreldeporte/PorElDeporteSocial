import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, type ScrollViewProps } from 'react-native'

import { useQuery } from '@tanstack/react-query'
import { Check, Plus } from '@tamagui/lucide-icons'
import { useRouter } from 'solito/router'

import {
  Button,
  Card,
  FullscreenSpinner,
  Input,
  Paragraph,
  ScrollView,
  SizableText,
  Theme,
  XStack,
  YStack,
  isWeb,
  submitButtonBaseProps,
  useToastController,
} from '@my/ui/public'
import { FloatingCtaDock } from 'app/components/FloatingCtaDock'
import { BRAND_COLORS } from 'app/constants/colors'
import { getDockSpacer } from 'app/constants/dock'
import { screenContentContainerStyle } from 'app/constants/layout'
import { api } from 'app/utils/api'
import { formatPhoneDisplay } from 'app/utils/phone'
import { formatProfileName } from 'app/utils/profileName'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { useUser } from 'app/utils/useUser'

type MemberProfile = {
  id: string
  first_name: string | null
  last_name: string | null
  name: string | null
  phone: string | null
}

const buildMemberName = (profile: MemberProfile) => {
  return formatProfileName(profile, 'Member') ?? 'Member'
}

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const GroupEditScreen = ({
  groupId,
  scrollProps,
  headerSpacer,
  topInset,
}: { groupId?: string | null } & ScrollHeaderProps) => {
  const { isAdmin, isLoading } = useUser()
  const router = useRouter()
  const supabase = useSupabase()
  const toast = useToastController()
  const utils = api.useContext()
  const isCreate = !groupId
  const insets = useSafeAreaInsets()
  const showFloatingCta = !isWeb
  const dockSpacer = showFloatingCta ? getDockSpacer(insets.bottom) : 0

  const groupQuery = api.groups.byId.useQuery(
    { id: groupId ?? '' },
    { enabled: Boolean(groupId) && isAdmin && !isLoading }
  )

  const membersQuery = useQuery({
    queryKey: ['members', 'approved', 'groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, first_name, last_name, phone')
        .eq('approval_status', 'approved')
        .order('first_name', { ascending: true })
        .order('last_name', { ascending: true })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: isAdmin && !isLoading,
  })

  const [name, setName] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    setInitialized(false)
  }, [groupId])

  useEffect(() => {
    if (initialized) return
    if (!groupId) {
      setName('')
      setSelectedIds(new Set())
      setInitialized(true)
      return
    }
    if (groupQuery.data) {
      setName(groupQuery.data.name ?? '')
      setSelectedIds(new Set(groupQuery.data.memberIds ?? []))
      setInitialized(true)
    }
  }, [groupId, groupQuery.data, initialized])

  const createMutation = api.groups.create.useMutation({
    onSuccess: async () => {
      await utils.groups.list.invalidate()
      toast.show('Group created')
      router.replace('/settings/groups')
    },
    onError: (error) => {
      toast.show('Unable to create group', { message: error.message })
    },
  })

  const updateMutation = api.groups.update.useMutation({
    onSuccess: async () => {
      await utils.groups.list.invalidate()
      toast.show('Group updated')
      router.back()
    },
    onError: (error) => {
      toast.show('Unable to update group', { message: error.message })
    },
  })

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data])
  const selectedCount = selectedIds.size
  const isSaving = isCreate ? createMutation.isPending : updateMutation.isPending
  const saveDisabled = name.trim().length < 2 || isSaving

  const toggleMember = (profileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(profileId)) {
        next.delete(profileId)
      } else {
        next.add(profileId)
      }
      return next
    })
  }

  const handleSave = () => {
    const payload = {
      name: name.trim(),
      memberIds: Array.from(selectedIds),
    }
    if (isCreate) {
      createMutation.mutate(payload)
      return
    }
    if (!groupId) return
    updateMutation.mutate({ id: groupId, ...payload })
  }

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
          Only admins can edit groups.
        </Paragraph>
      </YStack>
    )
  }

  if (!isCreate && groupQuery.isLoading && !groupQuery.data) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (!isCreate && groupQuery.isError) {
    return (
      <YStack f={1} ai="center" jc="center" gap="$2" px="$4" pt={topInset ?? 0}>
        <Paragraph theme="alt2">We couldn’t load this group.</Paragraph>
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
    <YStack f={1} position="relative">
      <ScrollView
        style={{ flex: 1 }}
        {...scrollViewProps}
        contentContainerStyle={mergedContentStyle}
      >
        {headerSpacer}
        <YStack maw={900} mx="auto" w="100%" space="$4" py="$4">
          <YStack gap="$2">
            <SizableText size="$6" fontWeight="700">
              {isCreate ? 'Create group' : 'Edit group'}
            </SizableText>
            <Paragraph theme="alt2">
              Groups control which members can see and join private games.
            </Paragraph>
            <YStack h={2} w={56} br={999} bg={BRAND_COLORS.primary} />
          </YStack>

          <YStack gap="$3">
            <YStack gap="$1">
              <SizableText size="$4" fontWeight="600">
                Group name
              </SizableText>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="e.g. Wednesday Squad"
                placeholderTextColor="$color10"
                autoCapitalize="words"
                autoCorrect={false}
                borderRadius={12}
                borderColor="$borderColor"
                backgroundColor="$background"
                color="$color"
              />
            </YStack>

            <YStack gap="$1">
              <SizableText size="$4" fontWeight="600">
                Members ({selectedCount})
              </SizableText>
              <Paragraph theme="alt2" size="$2">
                Removing members also removes them from upcoming group games.
              </Paragraph>
            </YStack>

            {membersQuery.isLoading ? (
              <Paragraph theme="alt2">Loading members…</Paragraph>
            ) : membersQuery.isError ? (
              <Paragraph theme="alt2">Unable to load members.</Paragraph>
            ) : members.length === 0 ? (
              <Paragraph theme="alt2">No approved members yet.</Paragraph>
            ) : (
              <YStack gap="$2">
                {members.map((member) => {
                  const selected = selectedIds.has(member.id)
                  const phoneLabel = formatPhoneDisplay(member.phone)
                  return (
                    <Card
                      key={member.id}
                      bordered
                      $platform-native={{ borderWidth: 0 }}
                      p="$3"
                      onPress={() => toggleMember(member.id)}
                      pressStyle={{ opacity: 0.8 }}
                    >
                      <XStack ai="center" jc="space-between" gap="$3" flexWrap="wrap">
                        <YStack gap="$0.5" flex={1} minWidth={200}>
                          <SizableText size="$4" fontWeight="600">
                            {buildMemberName(member)}
                          </SizableText>
                          {phoneLabel ? (
                            <Paragraph theme="alt2" size="$2">
                              {phoneLabel}
                            </Paragraph>
                          ) : null}
                        </YStack>
                        <Button
                          chromeless
                          size="$3"
                          icon={selected ? Check : Plus}
                          aria-label={selected ? 'Remove member' : 'Add member'}
                          onPress={(event) => {
                            event?.stopPropagation?.()
                            toggleMember(member.id)
                          }}
                        />
                      </XStack>
                    </Card>
                  )
                })}
              </YStack>
            )}

            {showFloatingCta ? null : (
              <Button mt="$2" disabled={saveDisabled} onPress={handleSave}>
                {isSaving ? 'Saving…' : isCreate ? 'Create group' : 'Save changes'}
              </Button>
            )}
          </YStack>
        </YStack>
        {showFloatingCta ? <YStack h={dockSpacer} /> : null}
      </ScrollView>
      {showFloatingCta ? (
        <FloatingCtaDock transparent>
          <Theme inverse>
            <XStack>
              <Button
                {...submitButtonBaseProps}
                flex={1}
                disabled={saveDisabled}
                onPress={handleSave}
              >
                {isSaving ? 'Saving…' : isCreate ? 'Create group' : 'Save changes'}
              </Button>
            </XStack>
          </Theme>
        </FloatingCtaDock>
      ) : null}
    </YStack>
  )
}
