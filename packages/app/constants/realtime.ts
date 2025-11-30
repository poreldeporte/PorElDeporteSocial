export const REALTIME_INVALIDATE_DELAY_MS = 120
export const REALTIME_DRAFT_REFETCH_DELAY_MS = 80

export const defaultRealtimeChannelConfig = {
  config: {
    broadcast: { self: false },
  },
} as const
