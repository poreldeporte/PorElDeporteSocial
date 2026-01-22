import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ScrollViewProps } from 'react-native'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import { PlusCircle, Send, Trash } from '@tamagui/lucide-icons'
import { LinearGradient } from '@tamagui/linear-gradient'
import { Button, Input, Paragraph, Spinner, XStack, YStack, isWeb, useToastController } from '@my/ui/public'
import { SolitoImage } from 'solito/image'

import { CHAT_MESSAGE_MAX_LENGTH, CHAT_REACTION_EMOJIS, formatChatTimestamp } from 'app/constants/chat'
import { WatermarkLogo } from 'app/components/WatermarkLogo'
import { useBrand } from 'app/provider/brand'
import { useThemeSetting } from 'app/provider/theme'
import type { ChatMessage } from 'app/types/chat'
import { useChatScroll } from 'app/utils/useChatScroll'
import { useRealtimeChatRoom } from 'app/utils/useRealtimeChatRoom'
import { api } from 'app/utils/api'
import { SCREEN_CONTENT_PADDING } from 'app/constants/layout'

type WhatsAppStyleChatProps = {
  roomId: string | null
  currentUserId?: string | null
  currentUserName?: string | null
  isAdmin?: boolean
  scrollProps?: ScrollViewProps
  topInset?: number
  bottomInset?: number
}

const logoSize = 35
const wallpaperGap = logoSize
const wallpaperTileSize = logoSize + wallpaperGap
export const WhatsAppStyleChat = ({
  roomId,
  currentUserId,
  currentUserName,
  isAdmin = false,
  scrollProps,
  topInset,
  bottomInset,
}: WhatsAppStyleChatProps) => {
  const { logo } = useBrand()
  const chatEnabled = Boolean(roomId && currentUserId && currentUserName)
  const toast = useToastController()
  const { resolvedTheme } = useThemeSetting()
  const isDark = resolvedTheme === 'dark'
  const chatColors = {
    bubbleOwnBg: '#1fb955',
    bubbleOwnText: '#062c17',
    bubbleOtherBg: isDark ? 'rgba(18,24,32,0.85)' : '$color2',
    bubbleOtherBorder: isDark ? 'rgba(255,255,255,0.2)' : '$color4',
    bubbleOtherText: '$color12',
    bubbleShadow: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.08)',
    deleteOwn: 'rgba(0,0,0,0.45)',
    deleteOther: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)',
    timeOwn: 'rgba(0,0,0,0.45)',
    timeOther: isDark ? 'rgba(255,255,255,0.65)' : '$color10',
    reactionBg: isDark ? 'rgba(0,0,0,0.35)' : '$color3',
    reactionActiveBg: isDark ? 'rgba(255,255,255,0.4)' : '$color4',
    reactionOwnText: '#062c17',
    reactionOtherText: '$color12',
    reactionCountOwn: 'rgba(0,0,0,0.5)',
    reactionCountOther: isDark ? 'rgba(255,255,255,0.8)' : '$color10',
    shellGradient: isDark
      ? ['rgba(5,8,13,0.25)', 'rgba(5,8,13,0.65)']
      : ['rgba(255,255,255,0.6)', 'rgba(240,242,245,0.95)'],
    shellOverlay: isDark ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.7)',
    inputBorder: isDark ? 'rgba(255,255,255,0.15)' : '$color4',
    inputShellBg: isDark ? 'rgba(0,0,0,0.6)' : '$color2',
    inputPlaceholder: isDark ? 'rgba(255,255,255,0.5)' : '$color10',
    inputText: '$color12',
    backgroundSolid: isDark ? '#05080d' : '#f6f7f9',
  }
  const { scrollRef, scrollToBottom } = useChatScroll()
  const historyQuery = api.chat.history.useInfiniteQuery(
    { roomId: roomId ?? '', limit: 40 },
    {
      enabled: chatEnabled && Boolean(roomId),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }
  )
  const sendMutation = api.chat.sendMessage.useMutation()
  const reactionMutation = api.chat.toggleReaction.useMutation()
  const deleteMutation = api.chat.deleteMessage.useMutation()
  const hydratedPagesRef = useRef(new Set<string>())

  const {
    messages,
    isConnected,
    status,
    lastError,
    broadcastMessage,
    broadcastReaction,
    broadcastDelete,
    hydrateHistory,
    reactionSummaries,
  } = useRealtimeChatRoom({
    roomId,
    user: chatEnabled && currentUserId && currentUserName ? { id: currentUserId, name: currentUserName } : null,
    enabled: chatEnabled,
  })
  const [draft, setDraft] = useState('')
  const [pickerForMessage, setPickerForMessage] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const deleteConfirmTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [patternUri, setPatternUri] = useState<string | null>(null)
  const wallpaperWebUri = useMemo(() => {
    if (!isWeb) return null
    if (typeof logo === 'string') return logo
    if (logo && typeof logo === 'object' && 'src' in logo) {
      return logo.src as string
    }
    return null
  }, [logo])

  useEffect(() => {
    scrollToBottom()
  }, [messages.length, scrollToBottom])

  useEffect(() => {
    if (!chatEnabled) {
      setPickerForMessage(null)
    }
  }, [chatEnabled])

  useEffect(() => {
    hydratedPagesRef.current.clear()
  }, [roomId])

  useEffect(() => {
    return () => {
      if (deleteConfirmTimerRef.current) {
        clearTimeout(deleteConfirmTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!historyQuery.data?.pages) return

    historyQuery.data.pages.forEach((page, index) => {
      const key = page.messages[0]?.id ?? `page-${index}-${page.nextCursor?.createdAt ?? 'end'}`
      if (hydratedPagesRef.current.has(key)) {
        return
      }
      hydrateHistory({ messages: page.messages, reactions: page.reactions })
      hydratedPagesRef.current.add(key)
    })
  }, [hydrateHistory, historyQuery.data])

  useEffect(() => {
    if (!isWeb || !wallpaperWebUri || typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }
    let cancelled = false
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.src = wallpaperWebUri
    image.onload = () => {
      if (cancelled) return
      const tileSize = wallpaperTileSize
      const canvas = document.createElement('canvas')
      canvas.width = tileSize
      canvas.height = tileSize
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, tileSize, tileSize)
      const drawSize = logoSize
      const offset = (tileSize - drawSize) / 2
      ctx.drawImage(image, offset, offset, drawSize, drawSize)
      setPatternUri(canvas.toDataURL('image/png'))
    }
    image.onerror = () => {
      if (!cancelled) {
        setPatternUri(null)
      }
    }
    return () => {
      cancelled = true
    }
  }, [wallpaperWebUri])

  const handleSend = useCallback(async () => {
    if (!chatEnabled || !isConnected || !roomId) return
    const content = draft.trim()
    if (!content) return

    try {
      const saved = await sendMutation.mutateAsync({ roomId, content })
      await broadcastMessage(saved as ChatMessage)
      setDraft('')
      setSendError(null)
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Unable to send message')
    }
  }, [broadcastMessage, chatEnabled, draft, isConnected, roomId, sendMutation])

  const handleToggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!chatEnabled || !isConnected || !currentUserId || !currentUserName) return
      try {
        const result = await reactionMutation.mutateAsync({ messageId, emoji })
        result.updates.forEach((update) =>
          broadcastReaction({
            messageId,
            emoji: update.emoji,
            userId: currentUserId,
            userName: currentUserName,
            action: update.action,
          })
        )
      } catch {
        // swallow errors for now; server state remains source of truth
      }
    },
    [broadcastReaction, chatEnabled, currentUserId, currentUserName, isConnected, reactionMutation]
  )

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!isAdmin) return

      if (pendingDeleteId !== messageId) {
        setPendingDeleteId(messageId)
        toast.show('Delete this message?', { message: 'Tap trash again to confirm.' })
        if (deleteConfirmTimerRef.current) {
          clearTimeout(deleteConfirmTimerRef.current)
        }
        deleteConfirmTimerRef.current = setTimeout(() => {
          setPendingDeleteId(null)
        }, 4000)
        return
      }

      setPendingDeleteId(null)
      if (deleteConfirmTimerRef.current) {
        clearTimeout(deleteConfirmTimerRef.current)
        deleteConfirmTimerRef.current = null
      }

      try {
        await deleteMutation.mutateAsync({ messageId })
        await broadcastDelete(messageId)
        toast.show('Message deleted')
      } catch (error) {
        toast.show('Unable to delete message', {
          message: error instanceof Error ? error.message : undefined,
        })
      }
    },
    [broadcastDelete, deleteMutation, isAdmin, pendingDeleteId, toast]
  )

  const renderedMessages = useMemo(() => {
    return messages.map((message, index) => {
      const previous = messages[index - 1]
      const isOwn = message.user.id === currentUserId
      const showHeader = !previous || previous.user.id !== message.user.id
      const reactions = reactionSummaries[message.id] ?? []
      const deleteIconColor = isOwn ? chatColors.deleteOwn : chatColors.deleteOther

      return (
        <YStack key={message.id} alignItems={isOwn ? 'flex-end' : 'flex-start'} gap="$1">
          {showHeader && !isOwn ? (
            <Paragraph size="$2" theme="alt2">
              {message.user.name}
            </Paragraph>
          ) : null}
          <YStack
            maxWidth="85%"
            px="$3"
            py="$2"
            br="$8"
            shadowColor={chatColors.bubbleShadow}
            shadowRadius={4}
            bg={isOwn ? chatColors.bubbleOwnBg : chatColors.bubbleOtherBg}
            borderWidth={isOwn ? 0 : 1}
            borderColor={isOwn ? 'transparent' : chatColors.bubbleOtherBorder}
          >
            <Paragraph color={isOwn ? chatColors.bubbleOwnText : chatColors.bubbleOtherText}>
              {message.content}
            </Paragraph>
            <XStack jc="flex-end" ai="center" gap="$1" mt="$1">
              <Paragraph
                size="$1"
                fontSize={10}
                letterSpacing={0.3}
                color={isOwn ? chatColors.timeOwn : chatColors.timeOther}
              >
                {formatChatTimestamp(message.createdAt)}
              </Paragraph>
            </XStack>
          </YStack>
          <XStack gap="$0.5" mt="$0.5" flexWrap="wrap">
            {reactions.map((reaction) => (
              <Button
                key={`${message.id}-${reaction.emoji}`}
                size="$1"
                disabled={!chatEnabled || !isConnected}
                onPress={() => handleToggleReaction(message.id, reaction.emoji)}
                px="$1.5"
                py="$0.5"
                br="$8"
                gap={2}
                ai="center"
                bg={reaction.reactedByCurrentUser ? chatColors.reactionActiveBg : chatColors.reactionBg}
                color={isOwn ? chatColors.reactionOwnText : chatColors.reactionOtherText}
              >
                <Paragraph size="$2">{reaction.emoji}</Paragraph>
                <Paragraph
                  size="$1"
                  fontSize={10}
                  color={isOwn ? chatColors.reactionCountOwn : chatColors.reactionCountOther}
                >
                  {reaction.count}
                </Paragraph>
              </Button>
            ))}
            {chatEnabled ? (
              <Button
                size="$1"
                circular
                disabled={!isConnected}
                onPress={() =>
                  setPickerForMessage((current) => (current === message.id ? null : message.id))
                }
              >
                <PlusCircle size={14} />
              </Button>
            ) : null}
          </XStack>
          {chatEnabled && pickerForMessage === message.id ? (
            <XStack gap="$1" flexWrap="wrap" py="$1">
              {CHAT_REACTION_EMOJIS.map((emoji) => (
                <Button
                  key={`${message.id}-${emoji}`}
                  size="$1"
                  px="$2"
                  py="$1"
                  onPress={() => {
                    handleToggleReaction(message.id, emoji)
                    setPickerForMessage(null)
                  }}
                >
                  {emoji}
                </Button>
              ))}
            </XStack>
          ) : null}
          {isAdmin ? (
            <Button
              size="$1"
              circular
              chromeless
              aria-label="Delete message"
              disabled={deleteMutation.isPending}
              onPress={() => handleDeleteMessage(message.id)}
              pressStyle={{ opacity: 0.7 }}
            >
              <Trash size={14} color={deleteIconColor} />
            </Button>
          ) : null}
        </YStack>
      )
    })
  }, [
    chatEnabled,
    currentUserId,
    handleToggleReaction,
    isConnected,
    deleteMutation.isPending,
    handleDeleteMessage,
    messages,
    pickerForMessage,
    reactionSummaries,
  ])

  const disabledCopy = !chatEnabled
    ? 'Sign in to chat with the crew.'
    : status === 'connecting'
      ? 'Connecting to chat…'
      : null

  const keyboardVerticalOffset = Platform.select({ ios: 80, android: 0, default: 0 })

  const handleLoadMore = useCallback(() => {
    if (!historyQuery.hasNextPage || historyQuery.isFetchingNextPage) return
    historyQuery.fetchNextPage().catch(() => undefined)
  }, [historyQuery])
  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const basePaddingBottom = SCREEN_CONTENT_PADDING.bottom + (bottomInset ?? 0)
  const basePaddingTop = topInset ? 0 : SCREEN_CONTENT_PADDING.top
  const baseContentStyle = {
    paddingHorizontal: SCREEN_CONTENT_PADDING.horizontal,
    paddingTop: basePaddingTop,
    gap: 16,
    flexGrow: 1,
    justifyContent: renderedMessages.length ? 'flex-start' : 'center',
    paddingBottom: basePaddingBottom,
  }
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
  )

  const chatShell = (
    <LinearGradient
      colors={chatColors.shellGradient}
      style={{ flex: 1, width: '100%', height: '100%' }}
    >
      <YStack f={1} bg="transparent">
        <YStack f={1} bg={chatColors.shellOverlay} overflow="hidden">
          <YStack f={1}>
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              {...scrollViewProps}
              contentContainerStyle={mergedContentStyle}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {historyQuery.isLoading && messages.length === 0 ? (
                <XStack ai="center" jc="center" py="$4">
                  <Spinner size="large" />
                </XStack>
              ) : renderedMessages.length ? (
                <>
                  {historyQuery.hasNextPage ? (
                    <Button
                      size="$2"
                      theme="alt1"
                      onPress={handleLoadMore}
                      disabled={historyQuery.isFetchingNextPage}
                    >
                      {historyQuery.isFetchingNextPage ? 'Loading…' : 'Load earlier'}
                    </Button>
                  ) : null}
                  {historyQuery.isFetchingNextPage ? (
                    <XStack ai="center" jc="center" py="$2">
                      <Spinner size="small" />
                    </XStack>
                  ) : null}
                  {renderedMessages}
                </>
              ) : (
                <Paragraph theme="alt2" size="$2">
                  No messages yet. Start the conversation.
                </Paragraph>
              )}
            </ScrollView>
          </YStack>

          <YStack
            px={SCREEN_CONTENT_PADDING.horizontal}
            pb="$2"
            gap="$2"
            borderTopWidth={1}
            borderColor={chatColors.inputBorder}
          >
            {status !== 'connected' ? (
              <Paragraph size="$2" theme="alt2">
                {status === 'connecting' ? 'Connecting…' : 'Offline'}
              </Paragraph>
            ) : null}
            {disabledCopy ? (
              <Paragraph theme="alt2" size="$2">
                {disabledCopy}
              </Paragraph>
            ) : null}
            {sendError ? (
              <Paragraph size="$2" color="$red10">
                {sendError}
              </Paragraph>
            ) : lastError ? (
              <Paragraph theme="alt2" size="$2">
                {lastError}
              </Paragraph>
            ) : null}
            <XStack ai="center" gap="$2" bg={chatColors.inputShellBg} br="$9" px="$1.5" py="$2">
              <Input
                flex={1}
                bg="transparent"
                color={chatColors.inputText}
                placeholder="Type a message"
                placeholderTextColor={chatColors.inputPlaceholder}
                value={draft}
                onChangeText={setDraft}
                editable={chatEnabled && isConnected && !sendMutation.isPending}
                maxLength={CHAT_MESSAGE_MAX_LENGTH}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <Button
                onPress={handleSend}
                disabled={!chatEnabled || !isConnected || !draft.trim()}
                circular
              >
                <Send size={18} />
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    </LinearGradient>
  )

  const backgroundPattern = patternUri ?? wallpaperWebUri

  if (isWeb && backgroundPattern) {
    return (
      <YStack
        f={1}
        height="100vh"
        style={{
          minHeight: '100vh',
          backgroundImage: `url(${backgroundPattern})`,
          backgroundSize: `${wallpaperTileSize}px ${wallpaperTileSize}px`,
          backgroundPosition: 'left top',
          backgroundRepeat: 'repeat',
          backgroundColor: chatColors.backgroundSolid,
        }}
      >
        {chatShell}
      </YStack>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <YStack f={1} bg={chatColors.backgroundSolid} position="relative">
        <WatermarkLogo style={{ bottom: 24, right: 16 }} />
        {chatShell}
      </YStack>
    </KeyboardAvoidingView>
  )
}
