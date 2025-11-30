import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'

import { defaultRealtimeChannelConfig } from 'app/constants/realtime'
import {
  CHAT_BROADCAST_EVENT,
  CHAT_DELETE_EVENT,
  CHAT_REACTION_EMOJIS,
  CHAT_REACTION_EVENT,
} from 'app/constants/chat'
import type { ChatMessage, ChatReactionSummary } from 'app/types/chat'
import { debugRealtimeLog } from './debugRealtime'
import { useSupabase } from './supabase/useSupabase'

type ChatUser = { id: string; name: string }

export type ChatRoomStatus = 'idle' | 'connecting' | 'connected' | 'error'

type ReactionSeed = Array<{ messageId: string; emoji: string; userId: string }>

type UseRealtimeChatRoomOptions = {
  roomId: string | null
  user?: ChatUser | null
  enabled?: boolean
  initialMessages?: ChatMessage[]
  initialReactions?: ReactionSeed
}

type ReactionState = Record<string, Record<string, Set<string>>>

type ReactionPayload = {
  messageId: string
  emoji: string
  userId: string
  userName: string
  action: 'add' | 'remove'
}

const EMPTY_MESSAGES: ChatMessage[] = []

const sortMessages = (messages: ChatMessage[]) =>
  [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

const buildReactionState = (seeds: ReactionSeed = []) => {
  const state: ReactionState = {}
  seeds.forEach(({ messageId, emoji, userId }) => {
    state[messageId] = state[messageId] ?? {}
    const bucket = state[messageId][emoji] ?? new Set<string>()
    bucket.add(userId)
    state[messageId][emoji] = bucket
  })
  return state
}

export const useRealtimeChatRoom = ({
  roomId,
  user,
  enabled = true,
  initialMessages = EMPTY_MESSAGES,
  initialReactions = [],
}: UseRealtimeChatRoomOptions) => {
  const supabase = useSupabase()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [status, setStatus] = useState<ChatRoomStatus>('idle')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [lastError, setLastError] = useState<string | null>(null)
  const [reactions, setReactions] = useState<ReactionState>({})
  const userId = user?.id ?? null
  const userName = user?.name ?? null
  const sessionKey = `${roomId ?? 'none'}|${userId ?? 'nouser'}|${userName ?? 'noname'}|${enabled ? 'on' : 'off'}`
  const sessionKeyRef = useRef(sessionKey)

  const initialMessageKey = initialMessages.map((message) => message.id).join('|')
  const initialReactionKey = initialReactions.map((entry) => `${entry.messageId}:${entry.emoji}:${entry.userId}`).join('|')

  const removeMessageLocally = useCallback((messageId: string) => {
    setMessages((current) => current.filter((message) => message.id !== messageId))
    setReactions((current) => {
      if (!current[messageId]) return current
      const next = { ...current }
      delete next[messageId]
      return next
    })
  }, [])

  const hydrateHistory = useCallback(
    ({ messages: seeds = [], reactions: reactionSeeds = [] }: { messages?: ChatMessage[]; reactions?: ReactionSeed }) => {
      if (seeds.length) {
        setMessages((current) => {
          const map = new Map<string, ChatMessage>()
          seeds.forEach((msg) => map.set(msg.id, msg))
          current.forEach((msg) => {
            if (!map.has(msg.id)) {
              map.set(msg.id, msg)
            }
          })
          return sortMessages(Array.from(map.values()))
        })
      }
      if (reactionSeeds.length) {
        setReactions((current) => {
          const next = { ...current }
          reactionSeeds.forEach(({ messageId, emoji, userId }) => {
            next[messageId] = next[messageId] ?? {}
            const bucket = new Set(next[messageId][emoji] ?? [])
            bucket.add(userId)
            next[messageId][emoji] = bucket
          })
          return next
        })
      }
    },
    []
  )

  useEffect(() => {
    if (initialMessages.length === 0 && initialReactions.length === 0) return
    hydrateHistory({ messages: initialMessages, reactions: initialReactions })
  }, [hydrateHistory, initialMessageKey, initialReactionKey, initialMessages.length, initialReactions.length])

  useEffect(() => {
    if (sessionKeyRef.current !== sessionKey) {
      sessionKeyRef.current = sessionKey
      setMessages([])
      setReactions({})
      setLastError(null)
    }
    if (!enabled || !roomId || !userId || !userName) {
      setStatus('idle')
      channelRef.current = null
    }
  }, [sessionKey, enabled, roomId, userId, userName])

  useEffect(() => {
    if (!supabase || !roomId || !userId || !userName || !enabled) {
      setStatus('idle')
      channelRef.current = null
      return
    }

    setStatus('connecting')
    const channel = supabase.channel(roomId, defaultRealtimeChannelConfig)
    channelRef.current = channel

    channel
      .on('broadcast', { event: CHAT_BROADCAST_EVENT }, (payload) => {
        const next = payload.payload as ChatMessage
        if (!next?.id) return
        setMessages((current) => mergeMessage(current, next))
      })
      .on('broadcast', { event: CHAT_REACTION_EVENT }, (payload) => {
        const reaction = payload.payload as ReactionPayload
        if (!reaction?.messageId || !reaction.emoji || !reaction.userId) return
        if (!CHAT_REACTION_EMOJIS.includes(reaction.emoji as (typeof CHAT_REACTION_EMOJIS)[number])) return
        setReactions((current) =>
          mutateReactions(current, reaction.messageId, reaction.emoji, reaction.userId, reaction.action)
        )
      })
      .on('broadcast', { event: CHAT_DELETE_EVENT }, (payload) => {
        const { messageId } = (payload.payload ?? {}) as { messageId?: string }
        if (!messageId) return
        removeMessageLocally(messageId)
      })
      .subscribe((channelStatus) => {
        debugRealtimeLog(roomId, `status:${channelStatus}`)
        if (channelStatus === 'SUBSCRIBED') {
          setStatus('connected')
          setLastError(null)
        } else if (channelStatus === 'CHANNEL_ERROR') {
          setStatus('error')
          setLastError('Channel error')
        } else if (channelStatus === 'TIMED_OUT') {
          setStatus('error')
          setLastError('Connection timed out')
        } else if (channelStatus === 'CLOSED') {
          setStatus('idle')
        }
      })

    return () => {
      supabase.removeChannel(channel)
      if (channelRef.current === channel) {
        channelRef.current = null
      }
      setStatus('idle')
    }
  }, [enabled, roomId, supabase, userId, userName, hydrateHistory, removeMessageLocally])

  const broadcastMessage = useCallback(
    async (message: ChatMessage) => {
      setMessages((current) => mergeMessage(current, message))

      if (!channelRef.current || status !== 'connected') {
        return
      }

      await channelRef.current.send({
        type: 'broadcast',
        event: CHAT_BROADCAST_EVENT,
        payload: message,
      })
    },
    [status]
  )

  const broadcastReaction = useCallback(
    async (payload: ReactionPayload) => {
      setReactions((current) => mutateReactions(current, payload.messageId, payload.emoji, payload.userId, payload.action))

      if (!channelRef.current || status !== 'connected') {
        return
      }

      await channelRef.current.send({
        type: 'broadcast',
        event: CHAT_REACTION_EVENT,
        payload,
      })
    },
    [status]
  )

  const broadcastDelete = useCallback(
    async (messageId: string) => {
      removeMessageLocally(messageId)

      if (!channelRef.current || status !== 'connected') {
        return
      }

      await channelRef.current.send({
        type: 'broadcast',
        event: CHAT_DELETE_EVENT,
        payload: { messageId },
      })
    },
    [removeMessageLocally, status]
  )

  const reactionSummaries = useMemo(() => {
    const summary: Record<string, ChatReactionSummary[]> = {}
    Object.entries(reactions).forEach(([messageId, emojiMap]) => {
      const entries = Object.entries(emojiMap)
        .map(([emoji, set]) => ({
          emoji,
          count: set.size,
          reactedByCurrentUser: userId ? set.has(userId) : false,
        }))
        .filter((entry) => entry.count > 0)
        .sort((a, b) => b.count - a.count)
      summary[messageId] = entries
    })
    return summary
  }, [reactions, userId])

  return {
    messages,
    isConnected: status === 'connected',
    status,
    lastError,
    broadcastMessage,
    broadcastReaction,
    broadcastDelete,
    hydrateHistory,
    reactionSummaries,
  }
}

const mergeMessage = (list: ChatMessage[], next: ChatMessage) => {
  const exists = list.some((message) => message.id === next.id)
  if (exists) {
    return sortMessages(list.map((message) => (message.id === next.id ? next : message)))
  }
  return sortMessages([...list, next])
}

const mutateReactions = (
  prev: ReactionState,
  messageId: string,
  emoji: string,
  userId: string,
  action: ReactionPayload['action']
) => {
  const next: ReactionState = { ...prev }
  const messageReactions = { ...(next[messageId] ?? {}) }
  const currentSet = new Set(messageReactions[emoji] ?? [])

  if (action === 'add') {
    currentSet.add(userId)
  } else {
    currentSet.delete(userId)
  }

  if (currentSet.size === 0) {
    delete messageReactions[emoji]
  } else {
    messageReactions[emoji] = currentSet
  }

  if (Object.keys(messageReactions).length === 0) {
    delete next[messageId]
  } else {
    next[messageId] = messageReactions
  }

  return next
}
