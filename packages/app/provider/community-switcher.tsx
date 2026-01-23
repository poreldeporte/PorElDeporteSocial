import type { ReactNode } from 'react'
import { createContext, useContext, useMemo } from 'react'

type CommunitySwitcherContextValue = {
  open: () => void
}

const CommunitySwitcherContext = createContext<CommunitySwitcherContextValue | null>(null)

export const CommunitySwitcherProvider = ({
  children,
  onOpen,
}: {
  children: ReactNode
  onOpen: () => void
}) => {
  const value = useMemo(() => ({ open: onOpen }), [onOpen])
  return (
    <CommunitySwitcherContext.Provider value={value}>
      {children}
    </CommunitySwitcherContext.Provider>
  )
}

export const useCommunitySwitcher = () => {
  return useContext(CommunitySwitcherContext)
}
