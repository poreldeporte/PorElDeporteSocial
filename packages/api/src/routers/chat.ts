import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { CHAT_REACTION_EMOJIS } from 'app/constants/chat'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { formatProfileName } from '../utils/profileName'

const reactionEnum = z.enum(CHAT_REACTION_EMOJIS)

const resolveDisplayName = (profile?: {
  name: string | null
  first_name: string | null
  last_name: string | null
}) => {
  return formatProfileName(profile, 'Member')
}

export const chatRouter = createTRPCRouter({
  history: protectedProcedure
    .input(
      z.object({
        roomId: z.string().min(1),
        limit: z.number().min(1).max(200).default(40),
        cursor: z
          .object({
            createdAt: z.string(),
            id: z.string().uuid(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx
      const limit = input.limit

      let query = supabase
        .from('chat_messages')
        .select(
          `
          id,
          room,
          content,
          created_at,
          profile_id,
          profiles (
            id,
            name,
            first_name,
            last_name
          )
        `
        )
        .eq('room', input.roomId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit + 1)

      if (input.cursor) {
        const { createdAt, id } = input.cursor
        const normalized = new Date(createdAt).toISOString()
        const encodedTimestamp = encodeURIComponent(normalized)
        const encodedId = encodeURIComponent(id)
        query = query.or(
          `and(created_at.eq.${encodedTimestamp},id.lt.${encodedId}),created_at.lt.${encodedTimestamp}`
        )
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      const rows = data ?? []
      const hasMore = rows.length > limit
      const trimmedRows = hasMore ? rows.slice(0, limit) : rows
      const sortedRows = trimmedRows.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      const messages = sortedRows.map((row) => ({
        id: row.id,
        content: row.content,
        createdAt: row.created_at,
        user: {
          id: row.profile_id,
          name: resolveDisplayName(row.profiles as any),
        },
      }))

      const messageIds = sortedRows.map((row) => row.id)
      let reactions: Array<{ messageId: string; emoji: string; userId: string }> = []

      if (messageIds.length > 0) {
        const { data: reactionRows, error: reactionsError } = await supabase
          .from('chat_message_reactions')
          .select('message_id, emoji, profile_id')
          .in('message_id', messageIds)

        if (reactionsError) {
          throw reactionsError
        }

        reactions =
          reactionRows?.map((row) => ({
            messageId: row.message_id,
            emoji: row.emoji,
            userId: row.profile_id,
          })) ?? []
      }

      const nextCursor = hasMore
        ? {
            createdAt: trimmedRows[trimmedRows.length - 1].created_at,
            id: trimmedRows[trimmedRows.length - 1].id,
          }
        : null

      return { messages, reactions, nextCursor }
    }),
  sendMessage: protectedProcedure
    .input(
      z.object({
        roomId: z.string().min(1),
        content: z.string().trim().min(1).max(400),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx
      if (!user?.id) {
        throw new Error('User required')
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room: input.roomId,
          profile_id: user.id,
          content: input.content,
        })
        .select(
          `
          id,
          content,
          created_at,
          profile_id,
          profiles (
            id,
            name,
            first_name,
            last_name
          )
        `
        )
        .single()

      if (error || !data) {
        throw error ?? new Error('Unable to send message')
      }

      return {
        id: data.id,
        content: data.content,
        createdAt: data.created_at,
        user: {
          id: data.profile_id,
          name: resolveDisplayName(data.profiles as any),
        },
      }
    }),
  toggleReaction: protectedProcedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        emoji: reactionEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx
      if (!user?.id) {
        throw new Error('User required')
      }

      const updates: Array<{ emoji: string; action: 'add' | 'remove' }> = []

      const { data: existing, error: existingError } = await supabase
        .from('chat_message_reactions')
        .select('id, emoji')
        .eq('message_id', input.messageId)
        .eq('profile_id', user.id)
        .maybeSingle()

      if (existingError) {
        throw existingError
      }

      if (existing?.emoji) {
        const { error: deleteError } = await supabase
          .from('chat_message_reactions')
          .delete()
          .eq('id', existing.id)

        if (deleteError) {
          throw deleteError
        }

        updates.push({ emoji: existing.emoji, action: 'remove' })

        if (existing.emoji === input.emoji) {
          return { messageId: input.messageId, updates }
        }
      }

      const { error: insertError } = await supabase.from('chat_message_reactions').insert({
        message_id: input.messageId,
        profile_id: user.id,
        emoji: input.emoji,
      })

      if (insertError) {
        throw insertError
      }

      updates.push({ emoji: input.emoji, action: 'add' })

      return { messageId: input.messageId, updates }
    }),
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx
      if (!user?.id) throw new Error('User required')

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      if (profile?.role !== 'admin' && profile?.role !== 'owner') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admins only' })
      }

      const { error: deleteError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', input.messageId)

      if (deleteError) {
        throw deleteError
      }

      return { messageId: input.messageId }
    }),
})
