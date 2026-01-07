import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useRealtimeChannel } from 'app/utils/useRealtimeChannel'

import { useSupabase } from '../supabase/useSupabase'
import { useUser } from '../useUser'

const getEvents = async (supabase, userId) => {
  return supabase
    .from('events')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(4)
}

function useEventsQuery() {
  const supabase = useSupabase()
  const { user } = useUser()
  const userId = user?.id ?? null
  const queryClient = useQueryClient()

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['events'] })
  }, [queryClient])

  const channelHandler = useCallback(
    (channel) => {
      if (!userId) return
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `profile_id=eq.${userId}` },
        invalidate
      )
    },
    [invalidate, userId]
  )

  useRealtimeChannel(userId ? `events:${userId}` : null, channelHandler, {
    enabled: Boolean(userId),
    onError: invalidate,
  })

  const queryFn = async () => {
    return getEvents(supabase, user?.id).then((result) => result.data)
  }

  return useQuery({
    queryKey: ['events'],
    queryFn,
  })
}

export default useEventsQuery
