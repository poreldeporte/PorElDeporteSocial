const isExpoDebug =
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_DEBUG_REALTIME === 'true'
const isNextDebug =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEBUG_REALTIME === 'true'

export const isRealtimeDebugEnabled = isExpoDebug || isNextDebug

export const debugRealtimeLog = (channel: string, message: string, payload?: unknown) => {
  if (!isRealtimeDebugEnabled) return
  const timestamp = new Date().toISOString()
  const prefix = `[realtime][${timestamp}][${channel}]`
  if (payload) {
    // eslint-disable-next-line no-console
    console.debug(prefix, message, payload)
  } else {
    // eslint-disable-next-line no-console
    console.debug(prefix, message)
  }
}
