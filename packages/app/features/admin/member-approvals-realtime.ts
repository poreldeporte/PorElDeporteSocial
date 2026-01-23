import type { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback } from 'react'

import { useRealtimeChannel } from 'app/utils/useRealtimeChannel'

type PendingApprovalsRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: { status?: string | null; community_id?: string | null } | null
  old: { status?: string | null; community_id?: string | null } | null
}

export const shouldInvalidatePendingApprovals = (
  payload: PendingApprovalsRealtimePayload,
  communityId?: string | null
) => {
  const nextStatus = payload.new?.status ?? null
  const previousStatus = payload.old?.status ?? null
  const nextCommunity = payload.new?.community_id ?? payload.old?.community_id ?? null
  if (communityId && nextCommunity && nextCommunity !== communityId) return false
  return nextStatus === 'pending' || previousStatus === 'pending'
}

export const useMemberApprovalsRealtime = (
  enabled: boolean,
  communityId: string | null | undefined,
  onInvalidate: () => void
) => {
  const channelHandler = useCallback(
    (channel: RealtimeChannel) => {
      const filter = communityId ? `community_id=eq.${communityId}` : undefined
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memberships', ...(filter ? { filter } : {}) },
        (payload) => {
          if (!shouldInvalidatePendingApprovals(payload as PendingApprovalsRealtimePayload, communityId)) return
          onInvalidate()
        }
      )
    },
    [communityId, onInvalidate]
  )

  useRealtimeChannel(communityId ? `memberships:pending-approvals:${communityId}` : null, channelHandler, {
    enabled: enabled && Boolean(communityId),
    onError: onInvalidate,
  })
}
