import { useEffect } from 'react'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

import { defaultRealtimeChannelConfig } from 'app/constants/realtime'
import { debugRealtimeLog } from './debugRealtime'
import { useSupabase } from './supabase/useSupabase'

type ChannelOptions = {
  enabled?: boolean
  config?: Parameters<SupabaseClient['channel']>[1]
  onError?: () => void
}

export const useRealtimeChannel = (
  channelName: string | null | undefined,
  configure: (channel: RealtimeChannel) => void,
  options?: ChannelOptions
) => {
  const supabase = useSupabase()
  const enabled = options?.enabled ?? true
  const config = options?.config ?? defaultRealtimeChannelConfig
  const onError = options?.onError

  useEffect(() => {
    if (!supabase || !channelName || !enabled) return

    const channel = supabase.channel(channelName, config)
    debugRealtimeLog(channelName, 'subscribe')
    configure(channel)
    channel.subscribe((status) => {
      debugRealtimeLog(channelName, `status:${status}`)
      if (status === 'CHANNEL_ERROR') {
        onError?.()
      }
    })

    return () => {
      debugRealtimeLog(channelName, 'unsubscribe')
      supabase
        .removeChannel(channel)
        .catch(() => undefined)
    }
  }, [supabase, channelName, configure, enabled, config, onError])
}
