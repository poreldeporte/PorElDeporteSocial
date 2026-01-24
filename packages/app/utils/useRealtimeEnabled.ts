import { useEffect, useState } from 'react'

const getInitialActive = () => {
  if (typeof document === 'undefined') return true
  return document.visibilityState === 'visible'
}

export const useRealtimeEnabled = (enabled = true) => {
  const [isActive, setIsActive] = useState(getInitialActive)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const handleVisibility = () => setIsActive(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  return enabled && isActive
}
