'use client'

import { YStack } from '@my/ui/public'
import { COMMUNITY_CHAT_ROOM } from 'app/constants/chat'
import { useUser } from 'app/utils/useUser'
import { WhatsAppStyleChat } from './components/WhatsAppStyleChat'

export const CommunityScreen = () => {
  const { user, displayName, role } = useUser()

  return (
    <YStack flex={1}>
      <WhatsAppStyleChat
        roomId={COMMUNITY_CHAT_ROOM}
        currentUserId={user?.id}
        currentUserName={displayName}
        isAdmin={role === 'admin'}
      />
    </YStack>
  )
}
