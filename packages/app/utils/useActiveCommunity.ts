import { useContext } from 'react'

import { CommunityContext } from 'app/provider/community'

export const useActiveCommunity = () => {
  const context = useContext(CommunityContext)
  if (!context) {
    throw new Error('useActiveCommunity must be used within CommunityProvider')
  }
  return context
}
