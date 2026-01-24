import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { useFocusEffect } from 'expo-router'

export const useRealtimeEnabled = (enabled = true) => {
  const [isFocused, setIsFocused] = useState(true)
  const [isActive, setIsActive] = useState(AppState.currentState === 'active')

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true)
      return () => setIsFocused(false)
    }, [])
  )

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setIsActive(state === 'active')
    })
    return () => subscription.remove()
  }, [])

  return enabled && isFocused && isActive
}
