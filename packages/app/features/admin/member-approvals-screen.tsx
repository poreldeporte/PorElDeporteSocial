import {
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { screenContentContainerStyle } from 'app/constants/layout'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import { useMemo, useState } from 'react'
import { useRouter } from 'solito/router'

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
  if (profile.name?.trim()) return profile.name.trim()
  const composed = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
  return composed || 'New member'
}

export const MemberApprovalsScreen = () => {
  const { role, isLoading } = useUser()
  const supabase = useSupabase()
  const toast = useToastController()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [approvingId, setApprovingId] = useState<string | null>(null)

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
    enabled: role === 'admin' && !isLoading,
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
      await queryClient.invalidateQueries({ queryKey: ['member-approvals', 'pending'] })
      toast.show('Member approved')
    },
    onError: (error: Error) => {
      toast.show('Unable to approve member', { message: error.message })
    },
    onSettled: () => {
      setApprovingId(null)
    },
  })

  const pendingMembers = useMemo(() => pendingQuery.data ?? [], [pendingQuery.data])

  if (isLoading) {
    return <FullscreenSpinner />
  }

  if (role !== 'admin') {
    return (
      <YStack f={1} ai="center" jc="center" px="$6" gap="$2">
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
    return <FullscreenSpinner />
  }

  return (
    <ScrollView contentContainerStyle={screenContentContainerStyle}>
      <YStack maw={900} mx="auto" w="100%" space="$4" py="$4">
        <YStack gap="$2">
          <SizableText size="$6" fontWeight="700">
            Member approvals
          </SizableText>
          <Paragraph theme="alt2">
            Review profiles and approve access when the details look right.
          </Paragraph>
        </YStack>
        {pendingQuery.isError ? (
          <Card bordered $platform-native={{ borderWidth: 0 }} p="$4">
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
          <Card bordered $platform-native={{ borderWidth: 0 }} p="$4">
            <Paragraph theme="alt2">No pending members right now.</Paragraph>
          </Card>
        ) : (
          pendingMembers.map((member: PendingProfile) => {
            const displayName = buildMemberName(member)
            const isApproving = approvingId === member.id && approveMutation.isPending
            return (
              <Card
                key={member.id}
                bordered
                $platform-native={{ borderWidth: 0 }}
                p="$4"
                gap="$3"
              >
                <YStack gap="$2">
                  <SizableText size="$5" fontWeight="600">
                    {displayName}
                  </SizableText>
                  {member.email ? <Paragraph theme="alt2">Email: {member.email}</Paragraph> : null}
                  {member.phone ? <Paragraph theme="alt2">Phone: {member.phone}</Paragraph> : null}
                  {member.position ? (
                    <Paragraph theme="alt2">Position: {member.position}</Paragraph>
                  ) : null}
                  {member.jersey_number ? (
                    <Paragraph theme="alt2">Jersey: {member.jersey_number}</Paragraph>
                  ) : null}
                  {member.birth_date ? (
                    <Paragraph theme="alt2">Birth date: {member.birth_date}</Paragraph>
                  ) : null}
                </YStack>
                <XStack gap="$2">
                  <Button
                    onPress={() => router.push(`/admin/approvals/${member.id}`)}
                    disabled={approveMutation.isPending}
                  >
                    Edit profile
                  </Button>
                  <Button
                    onPress={() => approveMutation.mutate(member.id)}
                    disabled={approveMutation.isPending}
                  >
                    {isApproving ? 'Approving...' : 'Approve'}
                  </Button>
                </XStack>
              </Card>
            )
          })
        )}
      </YStack>
    </ScrollView>
  )
}
