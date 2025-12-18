import { TRPCError } from '@trpc/server'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import type { Database } from '@my/supabase/types'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import { ensureAdmin } from '../utils/ensureAdmin'

const joinInput = z.object({
  gameId: z.string().uuid('Invalid game id'),
})

const leaveInput = joinInput
const confirmInput = joinInput

type QueueStatus = Database['public']['Enums']['game_queue_status'] | 'cancelled'
type RpcResult = { status: QueueStatus }

const mapRpcError = (error: PostgrestError) => {
  switch (error.message) {
    case 'game_not_found':
      return new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
    case 'game_not_open':
      return new TRPCError({ code: 'BAD_REQUEST', message: 'Game is not open for signups' })
    case 'waitlist_full':
      return new TRPCError({ code: 'BAD_REQUEST', message: 'Waitlist is full' })
    case 'unauthenticated':
      return new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in required' })
    default:
      return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }
}

const unwrapRpcResult = (result: RpcResult | null) => {
  if (!result?.status) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Queue mutation returned an empty status',
    })
  }
  return result.status
}

const promoteNextWaitlisted = async (supabase: SupabaseClient<Database>, gameId: string) => {
  const { data, error } = await supabase
    .from('game_queue')
    .select('id')
    .eq('game_id', gameId)
    .eq('status', 'waitlisted')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }

  if (!data) return false

  const { error: promoteError } = await supabase
    .from('game_queue')
    .update({
      status: 'confirmed',
      promoted_at: new Date().toISOString(),
      cancelled_at: null,
    })
    .eq('id', data.id)

  if (promoteError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: promoteError.message })
  }

  return true
}

const syncPendingGameLockState = async (supabase: SupabaseClient<Database>, gameId: string) => {
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('status, draft_status, capacity')
    .eq('id', gameId)
    .maybeSingle()

  if (gameError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: gameError.message })
  if (!game || game.draft_status !== 'pending' || !game.capacity) return

  const { count, error: countError } = await supabase
    .from('game_queue')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('status', 'confirmed')

  if (countError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: countError.message })

  const confirmed = count ?? 0
  if (confirmed >= game.capacity && game.status !== 'locked') {
    await supabase
      .from('games')
      .update({ status: 'locked' })
      .eq('id', gameId)
      .eq('status', 'scheduled')
      .eq('draft_status', 'pending')
  } else if (confirmed < game.capacity && game.status === 'locked') {
    await supabase
      .from('games')
      .update({ status: 'scheduled' })
      .eq('id', gameId)
      .eq('status', 'locked')
      .eq('draft_status', 'pending')
  }
}

export const queueRouter = createTRPCRouter({
  join: protectedProcedure.input(joinInput).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase.rpc('join_game_queue', {
      p_game_id: input.gameId,
    })

    if (error) throw mapRpcError(error)

    return { status: unwrapRpcResult(data as RpcResult | null) }
  }),

  leave: protectedProcedure.input(leaveInput).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase.rpc('leave_game_queue', {
      p_game_id: input.gameId,
    })

    if (error) throw mapRpcError(error)

    return { status: unwrapRpcResult(data as RpcResult | null) }
  }),

  confirmAttendance: protectedProcedure
    .input(confirmInput)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('game_queue')
        .update({
          attendance_confirmed_at: new Date().toISOString(),
        })
        .eq('game_id', input.gameId)
        .eq('profile_id', ctx.user.id)
        .eq('status', 'confirmed')
        .is('attendance_confirmed_at', null)
        .select('id')
        .maybeSingle()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      if (!data) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No active roster spot to confirm.',
        })
      }

      await syncPendingGameLockState(ctx.supabase, input.gameId)
      return { gameId: input.gameId }
    }),

  removeMember: protectedProcedure
    .input(z.object({ queueId: z.string().uuid('Invalid queue id') }))
    .mutation(async ({ ctx, input }) => {
      await ensureAdmin(ctx.supabase, ctx.user.id)

      const { data, error } = await supabaseAdmin
        .from('game_queue')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          attendance_confirmed_at: null,
        })
        .eq('id', input.queueId)
        .select('game_id')
        .maybeSingle()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      if (!data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Queue entry not found' })
      }

      await promoteNextWaitlisted(supabaseAdmin, data.game_id)
      await syncPendingGameLockState(supabaseAdmin, data.game_id)

      return { gameId: data.game_id }
    }),
})
