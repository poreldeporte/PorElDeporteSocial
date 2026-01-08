import { TRPCError } from '@trpc/server'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import type { Database } from '@my/supabase/types'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import { resetDraftForGame } from '../services/draft'
import { notifyWaitlistPromoted } from '../services/notifications'
import { ensureAdmin } from '../utils/ensureAdmin'

const joinInput = z.object({
  gameId: z.string().uuid('Invalid game id'),
})

const leaveInput = joinInput
const confirmInput = joinInput
const grabInput = joinInput

const adminAddInput = z.object({
  gameId: z.string().uuid('Invalid game id'),
  profileId: z.string().uuid('Invalid profile id'),
})

const adminConfirmInput = adminAddInput

type QueueStatus = Database['public']['Enums']['game_queue_status']

type RpcResult = {
  status: QueueStatus
  promoted_profile_id?: string | null
}

type ConfirmationRules = {
  status: Database['public']['Enums']['game_status']
  start_time: string | null
  confirmation_enabled: boolean
  join_cutoff_offset_minutes_from_kickoff: number
  communities: { confirmation_window_hours_before_kickoff: number } | null
}

const mapRpcError = (error: PostgrestError) => {
  switch (error.message) {
    case 'game_not_found':
      return new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })
    case 'game_not_open':
      return new TRPCError({ code: 'BAD_REQUEST', message: 'Game is not open for signups' })
    case 'join_cutoff_passed':
      return new TRPCError({ code: 'BAD_REQUEST', message: 'Join cutoff has passed' })
    case 'not_member':
      return new TRPCError({ code: 'FORBIDDEN', message: 'Membership required to join this game' })
    case 'draft_in_progress':
      return new TRPCError({ code: 'BAD_REQUEST', message: 'Draft is in progress' })
    case 'confirmation_disabled':
      return new TRPCError({ code: 'BAD_REQUEST', message: 'Attendance confirmation is disabled' })
    case 'crunch_time_disabled':
      return new TRPCError({ code: 'BAD_REQUEST', message: 'Crunch time is disabled' })
    case 'crunch_time_closed':
      return new TRPCError({ code: 'BAD_REQUEST', message: 'Crunch time is not open' })
    case 'not_waitlisted':
      return new TRPCError({ code: 'BAD_REQUEST', message: 'You are not on the waitlist' })
    case 'no_open_spot':
      return new TRPCError({ code: 'BAD_REQUEST', message: 'No open roster spot to grab' })
    case 'queue_not_found':
      return new TRPCError({ code: 'NOT_FOUND', message: 'Queue entry not found' })
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

const safelyNotify = async (action: () => Promise<void>) => {
  try {
    await action()
  } catch {
    return
  }
}

const fetchQueueStatus = async (
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
  return data?.status ?? null
}

const fetchDraftStatus = async (supabase: SupabaseClient<Database>, gameId: string) => {
  const { data, error } = await supabase
    .from('games')
    .select('draft_status')
    .eq('id', gameId)
    .maybeSingle()

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return data?.draft_status ?? null
}

const resetDraftIfNeeded = async ({
  gameId,
  actorId,
  rosterChanged,
}: {
  gameId: string
  actorId: string
  rosterChanged: boolean
}) => {
  if (!rosterChanged) return

  const draftStatus = await fetchDraftStatus(supabaseAdmin, gameId)
  if (!draftStatus || draftStatus === 'pending') return

  await resetDraftForGame({
    gameId,
    supabaseAdmin,
    actorId,
    preserveCaptains: false,
  })
}

const fetchConfirmationRules = async (supabase: SupabaseClient<Database>, gameId: string) => {
  const { data, error } = await supabase
    .from('games')
    .select(
      `status,
       start_time,
       confirmation_enabled,
       join_cutoff_offset_minutes_from_kickoff,
       communities!games_community_id_fkey (
         confirmation_window_hours_before_kickoff
       )`
    )
    .eq('id', gameId)
    .maybeSingle()

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  if (!data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' })

  return data as ConfirmationRules
}

const ensureConfirmationWindowOpen = (rules: ConfirmationRules) => {
  if (rules.status !== 'scheduled') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Game is not open for confirmations' })
  }

  if (!rules.confirmation_enabled) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Attendance confirmation is disabled' })
  }

  if (!rules.start_time || !rules.communities) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Game start time required to confirm attendance' })
  }

  const startTime = new Date(rules.start_time)
  const confirmationStart = new Date(
    startTime.getTime() - rules.communities.confirmation_window_hours_before_kickoff * 60 * 60 * 1000
  )
  const joinCutoff = new Date(
    startTime.getTime() - rules.join_cutoff_offset_minutes_from_kickoff * 60 * 1000
  )

  if (joinCutoff <= confirmationStart) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Confirmation window is closed' })
  }

  const now = new Date()
  if (now < confirmationStart || now >= joinCutoff) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Confirmation window is closed' })
  }
}


export const queueRouter = createTRPCRouter({
  join: protectedProcedure.input(joinInput).mutation(async ({ ctx, input }) => {
    const statusBefore = await fetchQueueStatus(ctx.supabase, input.gameId, ctx.user.id)
    const { data, error } = await ctx.supabase.rpc('join_game_queue', {
      p_game_id: input.gameId,
    })

    if (error) throw mapRpcError(error)

    const result = data as RpcResult | null
    const joinStatus = unwrapRpcResult(result)

    await resetDraftIfNeeded({
      gameId: input.gameId,
      actorId: ctx.user.id,
      rosterChanged: statusBefore !== 'rostered' && joinStatus === 'rostered',
    })

    return { status: joinStatus }
  }),

  leave: protectedProcedure.input(leaveInput).mutation(async ({ ctx, input }) => {
    const statusBefore = await fetchQueueStatus(ctx.supabase, input.gameId, ctx.user.id)
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
    }

    await resetDraftIfNeeded({
      gameId: input.gameId,
      actorId: ctx.user.id,
      rosterChanged: statusBefore === 'rostered',
    })

    return { status: leaveStatus }
  }),

  grabOpenSpot: protectedProcedure.input(grabInput).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase.rpc('grab_open_spot', {
      p_game_id: input.gameId,
    })

    if (error) throw mapRpcError(error)

    const result = data as RpcResult | null
    const status = unwrapRpcResult(result)

    await resetDraftIfNeeded({
      gameId: input.gameId,
      actorId: ctx.user.id,
      rosterChanged: true,
    })

    return { status }
  }),

  confirmAttendance: protectedProcedure
    .input(confirmInput)
    .mutation(async ({ ctx, input }) => {
      const rules = await fetchConfirmationRules(ctx.supabase, input.gameId)
      ensureConfirmationWindowOpen(rules)

      const { data, error } = await ctx.supabase
        .from('game_queue')
        .update({
          attendance_confirmed_at: new Date().toISOString(),
        })
        .eq('game_id', input.gameId)
        .eq('profile_id', ctx.user.id)
        .eq('status', 'rostered')
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
      return { gameId: input.gameId }
    }),

  addMember: protectedProcedure.input(adminAddInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const { data, error } = await supabaseAdmin.rpc('admin_add_to_queue', {
      p_game_id: input.gameId,
      p_profile_id: input.profileId,
    })

    if (error) throw mapRpcError(error)

    const result = data as RpcResult | null
    const status = unwrapRpcResult(result)

    await resetDraftIfNeeded({
      gameId: input.gameId,
      actorId: ctx.user.id,
      rosterChanged: status === 'rostered',
    })

    return { status }
  }),

  markAttendanceConfirmed: protectedProcedure.input(adminConfirmInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const { data: entry, error: entryError } = await supabaseAdmin
      .from('game_queue')
      .select('status, attendance_confirmed_at')
      .eq('game_id', input.gameId)
      .eq('profile_id', input.profileId)
      .maybeSingle()

    if (entryError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: entryError.message })
    }

    if (!entry || entry.status !== 'rostered') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Player is not rostered' })
    }

    if (!entry.attendance_confirmed_at) {
      const { error: updateError } = await supabaseAdmin
        .from('game_queue')
        .update({ attendance_confirmed_at: new Date().toISOString() })
        .eq('game_id', input.gameId)
        .eq('profile_id', input.profileId)
        .eq('status', 'rostered')

      if (updateError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
      }
    }

    return { ok: true }
  }),

  removeMember: protectedProcedure
    .input(z.object({ queueId: z.string().uuid('Invalid queue id') }))
    .mutation(async ({ ctx, input }) => {
      await ensureAdmin(ctx.supabase, ctx.user.id)

      const { data: queueRow, error: queueFetchError } = await supabaseAdmin
        .from('game_queue')
        .select('game_id, profile_id, status')
        .eq('id', input.queueId)
        .maybeSingle()

      if (queueFetchError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: queueFetchError.message })
      }
      if (!queueRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Queue entry not found' })
      }

      const { data, error } = await supabaseAdmin.rpc('admin_remove_queue_entry', {
        p_queue_id: input.queueId,
      })

      if (error) throw mapRpcError(error)

      const result = data as RpcResult | null
      unwrapRpcResult(result)

      const promotedProfileId = result?.promoted_profile_id ?? null
      if (promotedProfileId) {
        await safelyNotify(() =>
          notifyWaitlistPromoted({ supabaseAdmin, gameId: queueRow.game_id, profileId: promotedProfileId })
        )
      }

      await resetDraftIfNeeded({
        gameId: queueRow.game_id,
        actorId: ctx.user.id,
        rosterChanged: queueRow.status === 'rostered',
      })

      return { gameId: queueRow.game_id }
    }),
})
