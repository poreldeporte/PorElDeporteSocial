import { TRPCError } from '@trpc/server'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import type { Database } from '@my/supabase/types'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import {
  fetchDraftStartSnapshot,
  getDraftStartBlocker,
  resetDraftForGame,
  startDraftForGame,
} from '../services/draft'
import { ensureAdmin } from '../utils/ensureAdmin'
import {
  notifyDraftReady,
  notifyDraftReset,
  notifyDraftStarted,
  notifyRosterJoinedGlobal,
  notifyRosterLocked,
  notifyWaitlistPromoted,
} from '../services/notifications'

const joinInput = z.object({
  gameId: z.string().uuid('Invalid game id'),
})

const leaveInput = joinInput
const confirmInput = joinInput

type QueueStatus = Database['public']['Enums']['game_queue_status'] | 'cancelled'
type RpcResult = { status: QueueStatus; promoted_profile_id?: string | null }

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

const fetchGameStatus = async (supabase: SupabaseClient<Database>, gameId: string) => {
  const { data, error } = await supabase.from('games').select('status').eq('id', gameId).maybeSingle()
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return data?.status ?? null
}

const fetchUserQueueStatus = async (
  supabase: SupabaseClient<Database>,
  gameId: string,
  profileId: string
) => {
  const { data, error } = await supabase
    .from('game_queue')
    .select('status')
    .eq('game_id', gameId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return (data?.status as QueueStatus | undefined) ?? null
}

const isProfileCaptain = async (
  supabase: SupabaseClient<Database>,
  gameId: string,
  profileId: string
) => {
  const { data, error } = await supabase
    .from('game_captains')
    .select('profile_id')
    .eq('game_id', gameId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return Boolean(data)
}

const safelyNotify = async (action: () => Promise<void>) => {
  try {
    await action()
  } catch {
    return
  }
}

const promoteNextWaitlisted = async (supabase: SupabaseClient<Database>, gameId: string) => {
  const { data, error } = await supabase
    .from('game_queue')
    .select('id, profile_id')
    .eq('game_id', gameId)
    .eq('status', 'waitlisted')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }

  if (!data) return null

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

  return data.profile_id ?? null
}

const syncPendingGameLockState = async (supabase: SupabaseClient<Database>, gameId: string) => {
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('status, draft_status, capacity')
    .eq('id', gameId)
    .maybeSingle()

  if (gameError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: gameError.message })
  if (!game || game.draft_status !== 'pending' || !game.capacity) return

  const { count: confirmedCount, error: countError } = await supabase
    .from('game_queue')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('status', 'confirmed')

  if (countError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: countError.message })

  const { count: attendanceConfirmedCount, error: attendanceCountError } = await supabase
    .from('game_queue')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('status', 'confirmed')
    .not('attendance_confirmed_at', 'is', null)

  if (attendanceCountError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: attendanceCountError.message })
  }

  const confirmed = confirmedCount ?? 0
  const attendanceConfirmed = attendanceConfirmedCount ?? 0
  const shouldLock = confirmed >= game.capacity && attendanceConfirmed >= game.capacity

  if (shouldLock && game.status !== 'locked') {
    await supabase
      .from('games')
      .update({ status: 'locked' })
      .eq('id', gameId)
      .eq('status', 'scheduled')
      .eq('draft_status', 'pending')
  } else if (!shouldLock && game.status === 'locked') {
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
    const statusBefore = await fetchGameStatus(ctx.supabase, input.gameId)
    const userStatusBefore = await fetchUserQueueStatus(ctx.supabase, input.gameId, ctx.user.id)
    const { data, error } = await ctx.supabase.rpc('join_game_queue', {
      p_game_id: input.gameId,
    })

    if (error) throw mapRpcError(error)

    const result = data as RpcResult | null
    const joinStatus = unwrapRpcResult(result)
    if (userStatusBefore !== 'confirmed' && joinStatus === 'confirmed') {
      await safelyNotify(() =>
        notifyRosterJoinedGlobal({ supabaseAdmin, gameId: input.gameId, profileId: ctx.user.id })
      )
    }

    const statusAfter = await fetchGameStatus(ctx.supabase, input.gameId)
    if (statusBefore !== 'locked' && statusAfter === 'locked') {
      await safelyNotify(() => notifyRosterLocked({ supabaseAdmin, gameId: input.gameId }))
    }

    return { status: joinStatus }
  }),

  leave: protectedProcedure.input(leaveInput).mutation(async ({ ctx, input }) => {
    const statusBefore = await fetchGameStatus(ctx.supabase, input.gameId)
    const { data, error } = await ctx.supabase.rpc('leave_game_queue', {
      p_game_id: input.gameId,
    })

    if (error) throw mapRpcError(error)

    const result = data as RpcResult | null
    const leaveStatus = unwrapRpcResult(result)
    const promotedProfileId = result?.promoted_profile_id ?? null
    if (promotedProfileId) {
      await safelyNotify(() =>
        notifyWaitlistPromoted({ supabaseAdmin, gameId: input.gameId, profileId: promotedProfileId })
      )
      await safelyNotify(() =>
        notifyRosterJoinedGlobal({ supabaseAdmin, gameId: input.gameId, profileId: promotedProfileId })
      )
    }

    const statusAfter = await fetchGameStatus(ctx.supabase, input.gameId)
    if (statusBefore !== 'locked' && statusAfter === 'locked') {
      await safelyNotify(() => notifyRosterLocked({ supabaseAdmin, gameId: input.gameId }))
    }

    const { data: draftRow, error: draftError } = await supabaseAdmin
      .from('games')
      .select('draft_status')
      .eq('id', input.gameId)
      .maybeSingle()

    if (draftError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: draftError.message })
    }

    if (draftRow?.draft_status && draftRow.draft_status !== 'pending') {
      const leavingCaptain = await isProfileCaptain(supabaseAdmin, input.gameId, ctx.user.id)
      await resetDraftForGame({
        gameId: input.gameId,
        supabaseAdmin,
        actorId: ctx.user.id,
        preserveCaptains: !leavingCaptain,
      })
      await safelyNotify(() => notifyDraftReset({ supabaseAdmin, gameId: input.gameId }))
    }

    return { status: leaveStatus }
  }),

  confirmAttendance: protectedProcedure
    .input(confirmInput)
    .mutation(async ({ ctx, input }) => {
      const statusBefore = await fetchGameStatus(ctx.supabase, input.gameId)
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
      const statusAfter = await fetchGameStatus(ctx.supabase, input.gameId)
      if (statusBefore !== 'locked' && statusAfter === 'locked') {
        await safelyNotify(() => notifyRosterLocked({ supabaseAdmin, gameId: input.gameId }))
      }

      const { data: captainRows, error: captainsError } = await supabaseAdmin
        .from('game_captains')
        .select('profile_id')
        .eq('game_id', input.gameId)
        .order('slot', { ascending: true })

      if (captainsError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: captainsError.message })
      }

      const captainIds = (captainRows ?? [])
        .map((captain) => captain.profile_id)
        .filter((profileId): profileId is string => Boolean(profileId))

      if (captainIds.length >= 2) {
        const snapshot = await fetchDraftStartSnapshot(supabaseAdmin, input.gameId)
        const blocker = getDraftStartBlocker({ snapshot, captainCount: captainIds.length })
        if (!blocker) {
          const { data: readyGame, error: readyError } = await supabaseAdmin
            .from('games')
            .update({ draft_status: 'ready' })
            .eq('id', input.gameId)
            .eq('draft_status', 'pending')
            .select('id')
            .maybeSingle()

          if (readyError) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: readyError.message })
          }

          if (readyGame) {
            await safelyNotify(() => notifyDraftReady({ supabaseAdmin, gameId: input.gameId }))
            await startDraftForGame({
              gameId: input.gameId,
              captainProfileIds: captainIds,
              supabaseAuthed: ctx.supabase,
              supabaseAdmin,
              actorId: ctx.user.id,
            })
            await safelyNotify(() => notifyDraftStarted({ supabaseAdmin, gameId: input.gameId }))
          }
        }
      }
      return { gameId: input.gameId }
    }),

  removeMember: protectedProcedure
    .input(z.object({ queueId: z.string().uuid('Invalid queue id') }))
    .mutation(async ({ ctx, input }) => {
      await ensureAdmin(ctx.supabase, ctx.user.id)

      const { data: queueRow, error: queueFetchError } = await supabaseAdmin
        .from('game_queue')
        .select('game_id, profile_id')
        .eq('id', input.queueId)
        .maybeSingle()

      if (queueFetchError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: queueFetchError.message })
      }
      if (!queueRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Queue entry not found' })
      }

      const { data: gameRow, error: gameError } = await supabaseAdmin
        .from('games')
        .select('draft_status')
        .eq('id', queueRow.game_id)
        .maybeSingle()

      if (gameError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: gameError.message })
      }

      const isCaptain = queueRow.profile_id
        ? await isProfileCaptain(supabaseAdmin, queueRow.game_id, queueRow.profile_id)
        : false

      const statusBefore = await fetchGameStatus(supabaseAdmin, queueRow.game_id)
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

      const promotedProfileId = await promoteNextWaitlisted(supabaseAdmin, data.game_id)
      if (promotedProfileId) {
        await safelyNotify(() =>
          notifyWaitlistPromoted({ supabaseAdmin, gameId: data.game_id, profileId: promotedProfileId })
        )
        await safelyNotify(() =>
          notifyRosterJoinedGlobal({ supabaseAdmin, gameId: data.game_id, profileId: promotedProfileId })
        )
      }
      if (gameRow?.draft_status && gameRow.draft_status !== 'pending') {
        await resetDraftForGame({
          gameId: data.game_id,
          supabaseAdmin,
          actorId: ctx.user.id,
          preserveCaptains: !isCaptain,
        })
        await safelyNotify(() => notifyDraftReset({ supabaseAdmin, gameId: data.game_id }))
      }
      await syncPendingGameLockState(supabaseAdmin, data.game_id)
      const statusAfter = await fetchGameStatus(supabaseAdmin, data.game_id)
      if (statusBefore !== 'locked' && statusAfter === 'locked') {
        await safelyNotify(() => notifyRosterLocked({ supabaseAdmin, gameId: data.game_id }))
      }

      return { gameId: data.game_id }
    }),
})
