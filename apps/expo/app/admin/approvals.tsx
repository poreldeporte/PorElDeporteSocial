import { useMemo } from 'react'

import type { IconProps } from '@tamagui/helpers-icon'
import { ChevronLeft, UserPlus } from '@tamagui/lucide-icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { YStack } from '@my/ui/public'
import { MemberListScreen } from 'app/features/admin/member-list-screen'
import { useMemberApprovalsRealtime } from 'app/features/admin/member-approvals-realtime'
import { getScreenLayout } from 'app/navigation/layouts'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import { useRealtimeEnabled } from 'app/utils/useRealtimeEnabled'

import { FloatingHeaderLayout } from '../../components/FloatingHeaderLayout'

const layout = getScreenLayout('adminApprovals')

export default function Screen() {
  const router = useRouter()
  const { isAdmin, isLoading } = useUser()
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  const realtimeEnabled = useRealtimeEnabled(isAdmin && !isLoading)
  const invalidatePendingCount = () => {
    void queryClient.invalidateQueries({ queryKey: ['member-approvals', 'pending-count'] })
  }
  useMemberApprovalsRealtime(realtimeEnabled, null, invalidatePendingCount)
  const pendingCountQuery = useQuery({
    queryKey: ['member-approvals', 'pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
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
      return count ?? 0
    },
    enabled: realtimeEnabled,
  })
  const hasPending = (pendingCountQuery.data ?? 0) > 0
  const PendingIcon = useMemo(() => {
    return ({ size = 20, color }: IconProps) => (
      <YStack w={size} h={size} position="relative" ai="center" jc="center">
        <UserPlus size={size} color={color} />
        {hasPending ? (
          <YStack
            position="absolute"
            top={-1}
            right={-1}
            w={8}
            h={8}
            br={999}
            bg="$red9"
            borderWidth={1}
            borderColor="$background"
          />
        ) : null}
      </YStack>
    )
  }, [hasPending])
  const rightActions = realtimeEnabled
    ? [
        {
          icon: PendingIcon,
          onPress: () => router.push('/admin/approvals/pending'),
        },
      ]
    : undefined
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <FloatingHeaderLayout
          title={layout.title}
          leftIcon={ChevronLeft}
          onPressLeft={() => router.back()}
          rightActions={rightActions}
        >
          {({ scrollProps, HeaderSpacer, topInset }) => (
            <MemberListScreen scrollProps={scrollProps} headerSpacer={HeaderSpacer} topInset={topInset} />
          )}
        </FloatingHeaderLayout>
      </SafeAreaView>
    </>
  )
}
