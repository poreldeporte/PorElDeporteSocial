import type { SupabaseClient } from '@supabase/supabase-js'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import type { Database } from '@my/supabase/types'
import { supabaseAdmin } from '../supabase-admin'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { ensureAdmin } from '../utils/ensureAdmin'
import { formatProfileName } from '../utils/profileName'

const reviewInput = z.object({
  gameId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(400).optional(),
})

const listInput = z.object({
  gameId: z.string().uuid(),
})

export const reviewsRouter = createTRPCRouter({
  listByGame: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const communityId = await fetchGameCommunityId(ctx.supabase, input.gameId)
    await ensureAdmin(ctx.supabase, ctx.user.id, communityId)

    const { data, error } = await supabaseAdmin
      .from('game_reviews')
      .select(
        `
        id,
        rating,
        comment,
        created_at,
        profiles (
          id,
          name,
          first_name,
          last_name,
          avatar_url,
          jersey_number
        )
      `
      )
      .eq('game_id', input.gameId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    const reviews =
      data?.map((row) => ({
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at,
        player: {
          id: row.profiles?.id ?? null,
          name: formatProfileName(row.profiles, 'Member') ?? 'Member',
          avatarUrl: row.profiles?.avatar_url ?? null,
          jerseyNumber: row.profiles?.jersey_number ?? null,
        },
      })) ?? []

    const count = reviews.length
    const averageRating = count
      ? Math.round((reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / count) * 10) /
        10
      : 0

    return {
      summary: { count, averageRating },
      reviews,
    }
  }),
  submit: protectedProcedure.input(reviewInput).mutation(async ({ ctx, input }) => {
    const { data: game, error: gameError } = await ctx.supabase
      .from('games')
      .select('status')
      .eq('id', input.gameId)
      .maybeSingle()

    if (gameError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: gameError.message })
    }

    if (!game) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
    }

    if (game.status !== 'completed') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Game must be completed to rate' })
    }

    const { data: queueEntry, error: queueError } = await ctx.supabase
      .from('game_queue')
      .select('status')
      .eq('game_id', input.gameId)
      .eq('profile_id', ctx.user.id)
      .maybeSingle()

    if (queueError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: queueError.message })
    }

    if (!queueEntry || queueEntry.status !== 'rostered') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only rostered players can rate this game',
      })
    }

    const comment = input.comment?.trim()
    const { error: insertError } = await supabaseAdmin.from('game_reviews').insert({
      game_id: input.gameId,
      profile_id: ctx.user.id,
      rating: input.rating,
      comment: comment && comment.length ? comment : null,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        throw new TRPCError({ code: 'CONFLICT', message: 'You already rated this game' })
      }
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message })
    }

    return { ok: true }
  }),
})

const fetchGameCommunityId = async (supabase: SupabaseClient<Database>, gameId: string) => {
  const { data, error } = await supabase
    .from('games')
    .select('community_id')
    .eq('id', gameId)
    .maybeSingle()

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }
  if (!data?.community_id) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
  }

  return data.community_id
}
