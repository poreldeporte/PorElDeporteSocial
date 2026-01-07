import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useRealtimeChannel } from 'app/utils/useRealtimeChannel'

import { useSupabase } from '../supabase/useSupabase'

const getPosts = async (supabase) => {
  return supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(4)
}

function usePostQuery() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['posts'] })
  }, [queryClient])

  const channelHandler = useCallback(
    (channel) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        invalidate
      )
    },
    [invalidate]
  )

  useRealtimeChannel('posts:feed', channelHandler, { onError: invalidate })

  const queryFn = async () => {
    return getPosts(supabase).then((result) => result.data)
  }

  return useQuery({
    queryKey: ['posts'],
    queryFn,
  })
}

export default usePostQuery
