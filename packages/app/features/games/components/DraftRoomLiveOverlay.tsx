import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, KeyboardAvoidingView, Platform } from 'react-native'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { Send } from '@tamagui/lucide-icons'
import { LinearGradient } from '@tamagui/linear-gradient'

import {
  Avatar,
  Button,
  getTokens,
  Input,
  Paragraph,
  SizableText,
  XStack,
  YStack,
  useToastController,
} from '@my/ui/public'

import { CHAT_MESSAGE_MAX_LENGTH, getDraftChatRoomName } from 'app/constants/chat'
import { SCREEN_CONTENT_PADDING } from 'app/constants/layout'
import { defaultRealtimeChannelConfig } from 'app/constants/realtime'
import type { ChatMessage } from 'app/types/chat'
import { api } from 'app/utils/api'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { useRealtimeChatRoom } from 'app/utils/useRealtimeChatRoom'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'

const CHAT_COLLAPSED_COUNT = 3
const CHAT_EXPANDED_COUNT = 8
const MAX_FLOATING_REACTIONS = 25
const REACTION_WINDOW_MS = 1000
const REACTION_WINDOW_LIMIT = 4
const DEFAULT_REACTION_EMOJI = '❤️'
const LIVE_REACTION_EVENT = 'live_reaction'
const CHAT_IDLE_DELAY_MS = 3000
const CHAT_IDLE_OPACITY = 0.5
const overlayLayout = {
  inputHeight: 48,
  reactionButtonSize: 44,
  sideInset: SCREEN_CONTENT_PADDING.horizontal,
  bottomOffset: 8,
  messageGap: 12,
  messageMaxWidth: 360,
  avatarSize: 32,
  gradientHeight: 224,
}

export const DRAFT_CHAT_DOCK_HEIGHT =
  overlayLayout.bottomOffset + Math.max(overlayLayout.inputHeight, overlayLayout.reactionButtonSize)

export const getDraftChatDockInset = (bottomInset: number) =>
  bottomInset + DRAFT_CHAT_DOCK_HEIGHT
const overlayColors = {
  messageBg: '$black025',
  inputBorder: '$white025',
  inputBg: '$white025',
  actionBg: '$white025',
  textPrimary: '$white1',
} as const
const avatarPalette = [
  '$blue9',
  '$green9',
  '$orange9',
  '$pink9',
  '$purple9',
  '$yellow9',
  '$red9',
  '$gray9',
] as const

type DraftRoomLiveOverlayProps = {
  gameId: string
  enabled?: boolean
  collapsedMessageLimit?: number
  expandedMessageLimit?: number
}

type LiveReaction = {
  id: string
  emoji: string
  drift: number
  rise: number
  duration: number
}

export const DraftRoomLiveOverlay = ({
  gameId,
  enabled = true,
  collapsedMessageLimit,
  expandedMessageLimit,
}: DraftRoomLiveOverlayProps) => {
  const tokens = getTokens()
  const insets = useSafeAreaInsets()
  const toast = useToastController()
  const { user, displayName } = useUser()
  const roomId = useMemo(() => (gameId ? getDraftChatRoomName(gameId) : null), [gameId])
  const chatEnabled = Boolean(roomId && user?.id && displayName && enabled)

  const historyQuery = api.chat.history.useInfiniteQuery(
    { roomId: roomId ?? '', limit: 40 },
    {
      enabled: chatEnabled && Boolean(roomId),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }
  )
  const sendMutation = api.chat.sendMessage.useMutation()
  const hydratedPagesRef = useRef(new Set<string>())

  const {
    messages,
    broadcastMessage,
    hydrateHistory,
  } = useRealtimeChatRoom({
    roomId,
    user: chatEnabled && user?.id && displayName ? { id: user.id, name: displayName } : null,
    enabled: chatEnabled,
  })

  const [draft, setDraft] = useState('')
  const isSending = sendMutation.isPending

  useEffect(() => {
    hydratedPagesRef.current.clear()
  }, [roomId])

  useEffect(() => {
    if (!historyQuery.data?.pages) return

    historyQuery.data.pages.forEach((page, index) => {
      const key = page.messages[0]?.id ?? `page-${index}-${page.nextCursor?.createdAt ?? 'end'}`
      if (hydratedPagesRef.current.has(key)) return
      hydrateHistory({ messages: page.messages, reactions: page.reactions })
      hydratedPagesRef.current.add(key)
    })
  }, [hydrateHistory, historyQuery.data])

  const [chatOpacity, setChatOpacity] = useState(CHAT_IDLE_OPACITY)
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const lastMessageCountRef = useRef(0)

  const resolvedCollapsedLimit = Number.isFinite(collapsedMessageLimit)
    ? Math.max(0, collapsedMessageLimit as number)
    : CHAT_COLLAPSED_COUNT
  const resolvedExpandedLimit = Number.isFinite(expandedMessageLimit)
    ? Math.max(1, expandedMessageLimit as number)
    : CHAT_EXPANDED_COUNT
  const maxVisibleMessages = isChatExpanded ? resolvedExpandedLimit : resolvedCollapsedLimit
  const visibleMessages = useMemo(() => {
    if (maxVisibleMessages <= 0) return []
    return messages.slice(-maxVisibleMessages)
  }, [messages, maxVisibleMessages])

  const {
    reactions,
    sendReaction,
  } = useDraftLiveReactions({
    roomId,
    enabled: chatEnabled,
  })

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearChatIdle = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  const scheduleChatIdle = useCallback(() => {
    clearChatIdle()
    idleTimerRef.current = setTimeout(() => {
      setChatOpacity(CHAT_IDLE_OPACITY)
      setIsChatExpanded(false)
    }, CHAT_IDLE_DELAY_MS)
  }, [clearChatIdle])

  const expandChat = useCallback(
    (hold = false) => {
      setChatOpacity(1)
      setIsChatExpanded(true)
      if (hold) {
        clearChatIdle()
        return
      }
      scheduleChatIdle()
    },
    [clearChatIdle, scheduleChatIdle]
  )

  const collapseChat = useCallback(() => {
    clearChatIdle()
    setChatOpacity(CHAT_IDLE_OPACITY)
    setIsChatExpanded(false)
  }, [clearChatIdle])

  useEffect(() => {
    return () => {
      clearChatIdle()
    }
  }, [clearChatIdle])

  useEffect(() => {
    lastMessageCountRef.current = 0
  }, [roomId])

  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      expandChat()
    }
    lastMessageCountRef.current = messages.length
  }, [expandChat, messages.length])

  const handleInputFocus = useCallback(() => {
    expandChat(true)
  }, [expandChat])

  const handleInputBlur = useCallback(() => {
    scheduleChatIdle()
  }, [scheduleChatIdle])

  const canSend = Boolean(draft.trim()) && chatEnabled && !isSending
  const canReact = chatEnabled
  const handleSend = useCallback(async () => {
    if (!chatEnabled || !roomId || isSending) return
    const content = draft.trim()
    if (!content) return

    try {
      expandChat()
      const saved = await sendMutation.mutateAsync({ roomId, content })
      await broadcastMessage(saved as ChatMessage)
      setDraft('')
    } catch (error) {
      toast.show('Unable to send message', {
        message: error instanceof Error ? error.message : undefined,
      })
    }
  }, [broadcastMessage, chatEnabled, draft, expandChat, isSending, roomId, sendMutation, toast])

  if (!chatEnabled) return null

  const bottomInset = insets.bottom ?? 0
  const inputBottomOffset = bottomInset + overlayLayout.bottomOffset
  const messageBottomOffset =
    inputBottomOffset + overlayLayout.inputHeight + overlayLayout.messageGap
  const inputRightOffset =
    overlayLayout.reactionButtonSize + overlayLayout.sideInset * 2
  const keyboardOffset = Platform.OS === 'ios' ? insets.top ?? 0 : 0
  const keyboardBehavior =
    Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined
  const placeholderColor =
    tokens.color?.white075?.val ?? 'rgba(255,255,255,0.75)'
  const gradientColors = [
    tokens.color?.black0?.val ?? 'rgba(0,0,0,0)',
    tokens.color?.black05?.val ?? 'rgba(0,0,0,0.8)',
  ]

  return (
    <YStack position="absolute" top={0} left={0} right={0} bottom={0} pointerEvents="box-none">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={keyboardBehavior}
        keyboardVerticalOffset={keyboardOffset}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          position="absolute"
          left={0}
          right={0}
          bottom={0}
          h={overlayLayout.gradientHeight}
          pointerEvents="none"
        />

        {isChatExpanded ? (
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            onPress={collapseChat}
          />
        ) : null}

        <MessageStack
          messages={visibleMessages}
          bottomOffset={messageBottomOffset}
          stackOpacity={chatOpacity}
          onPress={expandChat}
        />

        <FloatingReactionLayer
          reactions={reactions}
          bottomOffset={inputBottomOffset}
          rightOffset={overlayLayout.sideInset}
        />

        <XStack
          position="absolute"
          left={overlayLayout.sideInset}
          right={inputRightOffset}
          bottom={inputBottomOffset}
          pointerEvents="box-none"
        >
          <XStack
            ai="center"
            gap="$2"
            px="$3"
            h={overlayLayout.inputHeight}
            flex={1}
            br="$10"
            borderWidth={1}
            borderColor={overlayColors.inputBorder}
            backgroundColor={overlayColors.inputBg}
            pointerEvents="auto"
          >
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder="Comment"
              placeholderTextColor={placeholderColor}
              color={overlayColors.textPrimary}
              borderWidth={0}
              backgroundColor="transparent"
              flex={1}
              p={0}
              h={overlayLayout.inputHeight}
              maxLength={CHAT_MESSAGE_MAX_LENGTH}
              autoCapitalize="sentences"
              autoCorrect
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <Button
              size="$2"
              br="$10"
              icon={Send}
              backgroundColor={overlayColors.actionBg}
              color={overlayColors.textPrimary}
              onPress={handleSend}
              disabled={!canSend}
              aria-label="Send message"
            />
          </XStack>
        </XStack>

        <Button
          position="absolute"
          right={overlayLayout.sideInset}
          bottom={inputBottomOffset}
          w={overlayLayout.reactionButtonSize}
          h={overlayLayout.reactionButtonSize}
          br={overlayLayout.reactionButtonSize}
          p={0}
          ai="center"
          jc="center"
          backgroundColor={overlayColors.actionBg}
          borderColor={overlayColors.inputBorder}
          borderWidth={1}
          onPress={() => sendReaction(DEFAULT_REACTION_EMOJI)}
          disabled={!canReact}
          aria-label="Send reaction"
          pointerEvents="auto"
          overflow="hidden"
        >
          <SizableText size="$4" lineHeight={20} textAlign="center" w="100%">
            ❤️
          </SizableText>
        </Button>
      </KeyboardAvoidingView>
    </YStack>
  )
}

const MessageStack = ({
  messages,
  bottomOffset,
  stackOpacity,
  onPress,
}: {
  messages: ChatMessage[]
  bottomOffset: number
  stackOpacity: number
  onPress?: () => void
}) => {
  if (!messages.length) return null

  return (
    <YStack
      position="absolute"
      left={overlayLayout.sideInset}
      bottom={bottomOffset}
      width="70%"
      maxWidth={overlayLayout.messageMaxWidth}
      gap="$1.5"
      o={stackOpacity}
      animation="200ms"
      pointerEvents="auto"
      onPress={onPress}
    >
      {messages.map((message, index) => {
        const opacity = resolveMessageOpacity(index, messages.length)
        const initials = buildInitials(message.user.name)
        const avatarColor = resolveAvatarColor(message.user.id)
        const avatarUrl = message.user.avatarUrl ?? null
        return (
          <XStack
            key={message.id}
            gap="$2"
            ai="center"
            flexShrink={1}
            minWidth={0}
            style={{ opacity }}
          >
            <Avatar circular size={overlayLayout.avatarSize} bg={avatarColor}>
              {avatarUrl ? (
                <Avatar.Image
                  source={{
                    uri: avatarUrl,
                    width: overlayLayout.avatarSize,
                    height: overlayLayout.avatarSize,
                  }}
                />
              ) : (
                <YStack f={1} ai="center" jc="center">
                  <SizableText size="$2" fontWeight="700" color={overlayColors.textPrimary}>
                    {initials}
                  </SizableText>
                </YStack>
              )}
            </Avatar>
            <XStack
              br={14}
              bg={overlayColors.messageBg}
              px="$2.5"
              py="$1.5"
              flexShrink={1}
              maxWidth="100%"
            >
              <Paragraph
                size="$2"
                color={overlayColors.textPrimary}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                <SizableText size="$2" fontWeight="600" color={overlayColors.textPrimary}>
                  {message.user.name}
                </SizableText>{' '}
                {message.content}
              </Paragraph>
            </XStack>
          </XStack>
        )
      })}
    </YStack>
  )
}

const FloatingReactionLayer = ({
  reactions,
  bottomOffset,
  rightOffset,
}: {
  reactions: LiveReaction[]
  bottomOffset: number
  rightOffset: number
}) => {
  if (!reactions.length) return null

  return (
    <YStack position="absolute" top={0} left={0} right={0} bottom={0} pointerEvents="none" overflow="visible">
      {reactions.map((reaction) => (
        <FloatingReaction
          key={reaction.id}
          reaction={reaction}
          bottomOffset={bottomOffset}
          rightOffset={rightOffset}
        />
      ))}
    </YStack>
  )
}

const FloatingReaction = ({
  reaction,
  bottomOffset,
  rightOffset,
}: {
  reaction: LiveReaction
  bottomOffset: number
  rightOffset: number
}) => {
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reaction.duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [progress, reaction.duration])

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -reaction.rise],
  })
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, reaction.drift],
  })
  const opacity = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 0],
  })
  const scale = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.8, 1, 1],
  })

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        right: rightOffset,
        fontSize: 24,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
      {reaction.emoji}
    </Animated.Text>
  )
}

const useDraftLiveReactions = ({ roomId, enabled }: { roomId: string | null; enabled: boolean }) => {
  const supabase = useSupabase()
  const [reactions, setReactions] = useState<LiveReaction[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const windowStartRef = useRef<number>(0)
  const sendCountRef = useRef<number>(0)
  const cleanupTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const spawnReaction = useCallback((emoji: string) => {
    const next: LiveReaction = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      emoji,
      drift: randomBetween(-20, 20),
      rise: randomBetween(300, 500),
      duration: randomBetween(1800, 3000),
    }

    setReactions((current) => {
      const updated = [...current, next]
      if (updated.length <= MAX_FLOATING_REACTIONS) return updated
      return updated.slice(updated.length - MAX_FLOATING_REACTIONS)
    })

    const timer = setTimeout(() => {
      setReactions((current) => current.filter((reaction) => reaction.id !== next.id))
    }, next.duration + 200)
    cleanupTimersRef.current.push(timer)
  }, [])

  useEffect(() => {
    if (!supabase || !roomId || !enabled) {
      channelRef.current = null
      return
    }

    const channel = supabase.channel(roomId, defaultRealtimeChannelConfig)
    channelRef.current = channel

    channel.on('broadcast', { event: LIVE_REACTION_EVENT }, (payload) => {
      const emoji = (payload.payload as { emoji?: string })?.emoji
      if (!emoji) return
      spawnReaction(emoji)
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel).catch(() => undefined)
      if (channelRef.current === channel) {
        channelRef.current = null
      }
    }
  }, [enabled, roomId, spawnReaction, supabase])

  useEffect(() => {
    return () => {
      cleanupTimersRef.current.forEach((timer) => clearTimeout(timer))
      cleanupTimersRef.current = []
    }
  }, [])

  const sendReaction = useCallback(
    async (emoji: string) => {
      if (!canSendReaction(windowStartRef, sendCountRef)) return

      spawnReaction(emoji)
      if (!channelRef.current) return
      await channelRef.current.send({
        type: 'broadcast',
        event: LIVE_REACTION_EVENT,
        payload: { emoji },
      })
    },
    [spawnReaction]
  )

  return { reactions, sendReaction }
}

const canSendReaction = (windowStartRef: React.MutableRefObject<number>, sendCountRef: React.MutableRefObject<number>) => {
  const now = Date.now()
  if (!windowStartRef.current || now - windowStartRef.current > REACTION_WINDOW_MS) {
    windowStartRef.current = now
    sendCountRef.current = 0
  }

  if (sendCountRef.current >= REACTION_WINDOW_LIMIT) {
    return false
  }

  sendCountRef.current += 1
  return true
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)

const buildInitials = (name: string) => {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase() || '?'
}

const resolveMessageOpacity = (index: number, total: number) => {
  if (total <= 1) return 1
  const min = 0.6
  const max = 1
  return min + (index / (total - 1)) * (max - min)
}

const resolveAvatarColor = (seed: string | null | undefined) => {
  if (!seed) return '$gray9'
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % avatarPalette.length
  return avatarPalette[index]
}
