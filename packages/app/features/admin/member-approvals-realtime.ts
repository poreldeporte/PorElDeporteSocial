import type { Database } from '@my/supabase/types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback } from 'react'

import { useRealtimeChannel } from 'app/utils/useRealtimeChannel'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

type PendingApprovalsRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Partial<ProfileRow> | null
  old: Partial<ProfileRow> | null
}

export const shouldInvalidatePendingApprovals = (
  payload: PendingApprovalsRealtimePayload
) => {
  const nextStatus = payload.new?.approval_status ?? null
  const previousStatus = payload.old?.approval_status ?? null
  return nextStatus === 'pending' || previousStatus === 'pending'
}

export const useMemberApprovalsRealtime = (
  enabled: boolean,
  onInvalidate: () => void
) => {
  const channelHandler = useCallback(
    (channel: RealtimeChannel) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          if (!shouldInvalidatePendingApprovals(payload as PendingApprovalsRealtimePayload)) return
          onInvalidate()
        }
      )
    },
    [onInvalidate]
  )

  useRealtimeChannel('profiles:pending-approvals', channelHandler, {
    enabled,
    onError: onInvalidate,
  })
}
