import type { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useRealtimeChannel } from 'app/utils/useRealtimeChannel'
import { useSessionContext } from 'app/utils/supabase/useSessionContext'

export const ProfileRealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useSessionContext()
  const userId = session?.user?.id ?? null
  const queryClient = useQueryClient()

  const invalidateProfile = useCallback(() => {
    if (!userId) return
    void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
  }, [queryClient, userId])

  const channelHandler = useCallback(
    (channel: RealtimeChannel) => {
      if (!userId) return
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        invalidateProfile
      )
    },
    [invalidateProfile, userId]
  )

  useRealtimeChannel(userId ? `profiles:${userId}` : null, channelHandler, {
    enabled: Boolean(userId),
    onError: invalidateProfile,
  })

  return children
}
