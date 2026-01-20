import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  Button,
  Card,
  Input,
  Paragraph,
  ScrollView,
  Sheet,
  SizableText,
  XStack,
  YStack,
  useToastController,
} from '@my/ui/public'
import { api } from 'app/utils/api'
import { formatPhoneDisplay } from 'app/utils/phone'
import { formatProfileName } from 'app/utils/profileName'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'

import type { GameDetail } from '../types'

type MemberProfile = {
  id: string
  name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
}

type AddPlayerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameId: string
  queue: GameDetail['queue']
  audienceGroupId?: string | null
}

const buildMemberName = (profile: MemberProfile) => {
  return formatProfileName(profile, 'Member') ?? 'Member'
}

export const AddPlayerSheet = ({
  open,
  onOpenChange,
  gameId,
  queue,
  audienceGroupId,
}: AddPlayerSheetProps) => {
  const { isAdmin, isLoading } = useUser()
  const supabase = useSupabase()
  const toast = useToastController()
  const utils = api.useUtils()
  const [query, setQuery] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)

  const groupQuery = api.groups.byId.useQuery(
    { id: audienceGroupId ?? '' },
    { enabled: open && isAdmin && Boolean(audienceGroupId) }
  )

  const membersQuery = useQuery({
    queryKey: ['members', 'approved', gameId],
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
    enabled: open && isAdmin && !isLoading,
  })

  const addMutation = api.queue.addMember.useMutation({
    onSuccess: async ({ status }) => {
      await Promise.all([utils.games.list.invalidate(), utils.games.byId.invalidate({ id: gameId })])
      toast.show(status === 'rostered' ? 'Added to roster' : 'Added to waitlist')
    },
    onError: (error) => {
      toast.show('Unable to add player', { message: error.message })
    },
    onSettled: () => setAddingId(null),
  })

  const queueStatus = useMemo(() => {
    const map = new Map<string, GameDetail['queue'][number]['status']>()
    queue.forEach((entry) => {
      if (entry.profileId) {
        map.set(entry.profileId, entry.status)
      }
    })
    return map
  }, [queue])

  const normalizedQuery = query.trim().toLowerCase()
  const queryDigits = normalizedQuery.replace(/\D/g, '')
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data])
  const allowedIds = useMemo(() => {
    if (!audienceGroupId) return null
    const ids = groupQuery.data?.memberIds ?? []
    return new Set(ids)
  }, [audienceGroupId, groupQuery.data?.memberIds])
  const visibleMembers = useMemo(() => {
    const base = members.filter((member) => {
      if (queueStatus.get(member.id) === 'rostered') return false
      if (allowedIds && !allowedIds.has(member.id)) return false
      return true
    })
    if (!normalizedQuery) return base
    return base.filter((member) => {
      const name = buildMemberName(member).toLowerCase()
      const phoneDigits = (member.phone ?? '').replace(/\D/g, '')
      const nameMatch = name.includes(normalizedQuery)
      const phoneMatch = queryDigits ? phoneDigits.includes(queryDigits) : false
      return nameMatch || phoneMatch
    })
  }, [members, normalizedQuery, queryDigits, queueStatus])

  const handleAdd = (profileId: string) => {
    setAddingId(profileId)
    addMutation.mutate({ gameId, profileId })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      modal
      snapPoints={[80]}
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
          <XStack ai="center" jc="space-between">
            <SizableText fontSize={20} fontWeight="700">
              Add player
            </SizableText>
            <Button chromeless size="$2" onPress={() => onOpenChange(false)}>
              Close
            </Button>
          </XStack>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search members"
            placeholderTextColor="$color10"
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="search"
            borderRadius={12}
            borderColor="$borderColor"
            backgroundColor="$background"
            color="$color"
          />
        </YStack>
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack px="$4" pb="$4" gap="$2">
            {membersQuery.isLoading ? (
              <Paragraph theme="alt2">Loading members…</Paragraph>
            ) : membersQuery.isError ? (
              <Paragraph theme="alt2">Unable to load members.</Paragraph>
            ) : visibleMembers.length === 0 ? (
              <Paragraph theme="alt2">No matches found.</Paragraph>
            ) : (
              visibleMembers.map((member) => {
                const status = queueStatus.get(member.id) ?? 'none'
                const canAdd = status === 'none' || status === 'dropped'
                const label =
                  status === 'dropped' ? 'Re-add' : status === 'waitlisted' ? 'Waitlisted' : 'Add'
                const isAdding = addingId === member.id && addMutation.isPending
                const phoneLabel = formatPhoneDisplay(member.phone)
                return (
                  <Card key={member.id} bordered $platform-native={{ borderWidth: 0 }} p="$3">
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
                        size="$2"
                        disabled={!canAdd || addMutation.isPending}
                        onPress={() => handleAdd(member.id)}
                      >
                        {isAdding ? 'Adding…' : label}
                      </Button>
                    </XStack>
                  </Card>
                )
              })
            )}
          </YStack>
        </ScrollView>
      </Sheet.Frame>
    </Sheet>
  )
}
