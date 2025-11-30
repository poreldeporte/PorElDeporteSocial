import { useCallback, useRef } from 'react'
import type { ScrollView } from 'react-native'

export const useChatScroll = () => {
  const scrollRef = useRef<ScrollView | null>(null)

  const scrollToBottom = useCallback(() => {
    try {
      scrollRef.current?.scrollToEnd({ animated: true })
    } catch {
      // no-op
    }
  }, [])

  return { scrollRef, scrollToBottom }
}
