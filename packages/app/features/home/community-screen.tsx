'use client'

import type { ScrollViewProps } from 'react-native'
import { type ReactNode } from 'react'

import { YStack } from '@my/ui/public'
import { COMMUNITY_CHAT_ROOM } from 'app/constants/chat'
import { useUser } from 'app/utils/useUser'
import { WhatsAppStyleChat } from './components/WhatsAppStyleChat'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const CommunityScreen = ({ scrollProps, headerSpacer, topInset }: ScrollHeaderProps = {}) => {
  const { user, displayName, isAdmin } = useUser()

  return (
    <YStack flex={1}>
      {headerSpacer}
      <WhatsAppStyleChat
        roomId={COMMUNITY_CHAT_ROOM}
        currentUserId={user?.id}
        currentUserName={displayName}
        isAdmin={isAdmin}
        scrollProps={scrollProps}
        topInset={topInset}
      />
    </YStack>
  )
}
