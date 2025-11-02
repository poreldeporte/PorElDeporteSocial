import React, { createContext, useContext, useState, ReactNode } from 'react'

interface GlobalStoreState {
  toggleCreateModal: boolean
  setToggleCreateModal: () => void
}

interface GlobalStoreProviderProps {
  children: ReactNode
}

const GlobalStoreContext = createContext<GlobalStoreState | undefined>(undefined)

export const GlobalStoreProvider: React.FC<GlobalStoreProviderProps> = ({ children }) => {
  const [toggleCreateModal, setToggleCreateModalState] = useState(false)

  const setToggleCreateModal = () => {
    setToggleCreateModalState((prev) => !prev)
  }

  return (
    <GlobalStoreContext.Provider value={{ toggleCreateModal, setToggleCreateModal }}>
      {children}
    </GlobalStoreContext.Provider>
  )
}

export const useGlobalStore = (): GlobalStoreState => {
  const context = useContext(GlobalStoreContext)
  if (context === undefined) {
    throw new Error('useGlobalStore must be used within a GlobalStoreProvider')
  }
  return context
}
