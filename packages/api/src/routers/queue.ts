import { TRPCError } from '@trpc/server'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import type { Database } from '@my/supabase/types'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import { resetDraftForGame } from '../services/draft'
import { notifyGuestNeedsConfirmation, notifyTardyMarked, notifyWaitlistPromoted } from '../services/notifications'
import { ensureAdmin } from '../utils/ensureAdmin'

const joinInput = z.object({
  gameId: z.string().uuid('Invalid game id'),
})

const leaveInput = joinInput
const confirmInput = joinInput
const grabInput = joinInput
const addGuestInput = z.object({
  gameId: z.string().uuid('Invalid game id'),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  phone: z.string().trim().min(1, 'Guest phone is required'),
  notes: z.string().nullable().optional(),
})
const confirmGuestInput = z.object({
  queueId: z.string().uuid('Invalid queue id'),
})

const adminAddInput = z.object({
  gameId: z.string().uuid('Invalid game id'),
  profileId: z.string().uuid('Invalid profile id'),
})

const adminConfirmInput = adminAddInput
const markNoShowInput = z.object({
  queueId: z.string().uuid('Invalid queue id'),
  isNoShow: z.boolean(),
})
const markTardyInput = z.object({
  queueId: z.string().uuid('Invalid queue id'),
  isTardy: z.boolean(),
})
const markConfirmedInput = z.object({
  queueId: z.string().uuid('Invalid queue id'),
})

type QueueStatus = Database['public']['Enums']['game_queue_status']

type RpcResult = {
  status: QueueStatus
  promoted_profile_id?: string | null
  promoted_guest_queue_id?: string | null
}

type ConfirmationRules = {
  status: Database['public']['Enums']['game_status']
  start_time: string | null
  release_at: string | null
  released_at: string | null
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
    case 'game_not_released':
      return new TRPCError({ code: 'BAD_REQUEST', message: 'Game has not been released yet' })
    case 'join_cutoff_passed':
      return new TRPCError({ code: 'BAD_REQUEST', message: 'Join cutoff has passed' })
    case 'not_member':
      return new TRPCError({ code: 'FORBIDDEN', message: 'Membership required to join this game' })
    case 'not_in_group':
      return new TRPCError({ code: 'FORBIDDEN', message: 'You are not in this game group' })
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
    case 'guest_limit_reached':
      return new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Guest limit reached (max 4 per member).',
      })
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

const isUserAdmin = async (supabase: SupabaseClient<Database>, userId: string) => {
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return data?.role === 'admin' || data?.role === 'owner'
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
       release_at,
       released_at,
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
  if (data.release_at && !data.released_at) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Game has not been released yet' })
  }

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
    const promotedGuestQueueId = result?.promoted_guest_queue_id ?? null
    if (promotedProfileId) {
      await safelyNotify(() =>
        notifyWaitlistPromoted({ supabaseAdmin, gameId: input.gameId, profileId: promotedProfileId })
      )
    }
    if (promotedGuestQueueId) {
      await safelyNotify(() =>
        notifyGuestNeedsConfirmation({ supabaseAdmin, gameId: input.gameId, guestQueueId: promotedGuestQueueId })
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

  addGuest: protectedProcedure.input(addGuestInput).mutation(async ({ ctx, input }) => {
    const guestName = [input.firstName.trim(), input.lastName.trim()].filter(Boolean).join(' ').trim()
    const { data, error } = await ctx.supabase.rpc('add_guest_to_queue', {
      p_game_id: input.gameId,
      p_guest_name: guestName,
      p_guest_phone: input.phone.trim(),
      p_guest_notes: input.notes?.trim() || null,
    })

    if (error) throw mapRpcError(error)

    const result = data as { status?: QueueStatus; queue_id?: string | null } | null
    if (!result?.status) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Queue mutation returned an empty status',
      })
    }

    const queueId = result.queue_id ?? null
    if (result.status === 'rostered' && queueId) {
      await safelyNotify(() =>
        notifyGuestNeedsConfirmation({ supabaseAdmin, gameId: input.gameId, guestQueueId: queueId })
      )
    }

    await resetDraftIfNeeded({
      gameId: input.gameId,
      actorId: ctx.user.id,
      rosterChanged: result.status === 'rostered',
    })

    return { status: result.status, queueId }
  }),

  confirmGuestAttendance: protectedProcedure
    .input(confirmGuestInput)
    .mutation(async ({ ctx, input }) => {
      const { data: queueRow, error: queueError } = await supabaseAdmin
        .from('game_queue')
        .select('id, game_id, profile_id, added_by_profile_id, status, attendance_confirmed_at')
        .eq('id', input.queueId)
        .maybeSingle()

      if (queueError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: queueError.message })
      }
      if (!queueRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Queue entry not found' })
      }
      if (queueRow.profile_id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Queue entry is not a guest' })
      }
      if (queueRow.status !== 'rostered') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Guest is not rostered' })
      }

      const rules = await fetchConfirmationRules(ctx.supabase, queueRow.game_id)
      const admin = await isUserAdmin(ctx.supabase, ctx.user.id)
      if (!admin && queueRow.added_by_profile_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the adder can confirm this guest' })
      }

      if (!queueRow.attendance_confirmed_at) {
        if (!admin) {
          ensureConfirmationWindowOpen(rules)
        }

        const { error: updateError } = await supabaseAdmin
          .from('game_queue')
          .update({ attendance_confirmed_at: new Date().toISOString() })
          .eq('id', input.queueId)
          .eq('status', 'rostered')
          .is('attendance_confirmed_at', null)

        if (updateError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
        }
      }

      return { gameId: queueRow.game_id }
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

  markNoShow: protectedProcedure.input(markNoShowInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const { data: queueRow, error: queueError } = await supabaseAdmin
      .from('game_queue')
      .select('id, game_id, status, no_show_at, games!game_queue_game_id_fkey ( status )')
      .eq('id', input.queueId)
      .maybeSingle()

    if (queueError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: queueError.message })
    }
    if (!queueRow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Queue entry not found' })
    }
    if (queueRow.status !== 'rostered') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Player is not rostered' })
    }
    if (queueRow.games?.status !== 'completed') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Game must be completed' })
    }

    const nextNoShowAt = input.isNoShow ? new Date().toISOString() : null
    const nextNoShowBy = input.isNoShow ? ctx.user.id : null
    const updatePayload = {
      no_show_at: nextNoShowAt,
      no_show_by: nextNoShowBy,
    } as {
      no_show_at: string | null
      no_show_by: string | null
      tardy_at?: string | null
      tardy_by?: string | null
    }
    if (input.isNoShow) {
      updatePayload.tardy_at = null
      updatePayload.tardy_by = null
    }

    const { error: updateError } = await supabaseAdmin
      .from('game_queue')
      .update(updatePayload)
      .eq('id', input.queueId)

    if (updateError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
    }

    return { gameId: queueRow.game_id, noShowAt: nextNoShowAt }
  }),

  markTardy: protectedProcedure.input(markTardyInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const { data: queueRow, error: queueError } = await supabaseAdmin
      .from('game_queue')
      .select(
        'id, game_id, profile_id, status, attendance_confirmed_at, guest_name, added_by_profile_id, games!game_queue_game_id_fkey ( status )'
      )
      .eq('id', input.queueId)
      .maybeSingle()

    if (queueError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: queueError.message })
    }
    if (!queueRow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Queue entry not found' })
    }
    if (queueRow.status !== 'rostered') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Player is not rostered' })
    }
    if (queueRow.games?.status !== 'completed') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Game must be completed' })
    }

    const now = new Date().toISOString()
    const nextTardyAt = input.isTardy ? now : null
    const nextTardyBy = input.isTardy ? ctx.user.id : null
    const nextConfirmedAt =
      input.isTardy && !queueRow.attendance_confirmed_at ? now : queueRow.attendance_confirmed_at ?? null
    const updatePayload = {
      tardy_at: nextTardyAt,
      tardy_by: nextTardyBy,
      attendance_confirmed_at: nextConfirmedAt,
    } as {
      tardy_at: string | null
      tardy_by: string | null
      attendance_confirmed_at: string | null
      no_show_at?: string | null
      no_show_by?: string | null
    }
    if (input.isTardy) {
      updatePayload.no_show_at = null
      updatePayload.no_show_by = null
    }

    const { error: updateError } = await supabaseAdmin
      .from('game_queue')
      .update(updatePayload)
      .eq('id', input.queueId)

    if (updateError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
    }

    if (input.isTardy) {
      const notifyTargetId = queueRow.profile_id ?? queueRow.added_by_profile_id
      if (notifyTargetId) {
        await safelyNotify(() =>
          notifyTardyMarked({
            supabaseAdmin,
            gameId: queueRow.game_id,
            profileId: notifyTargetId,
            guestName: queueRow.profile_id ? null : queueRow.guest_name,
          })
        )
      }
    }

    return { gameId: queueRow.game_id, tardyAt: nextTardyAt }
  }),

  markConfirmed: protectedProcedure.input(markConfirmedInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const { data: queueRow, error: queueError } = await supabaseAdmin
      .from('game_queue')
      .select('id, game_id, status, attendance_confirmed_at, games!game_queue_game_id_fkey ( status )')
      .eq('id', input.queueId)
      .maybeSingle()

    if (queueError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: queueError.message })
    }
    if (!queueRow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Queue entry not found' })
    }
    if (queueRow.status !== 'rostered') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Player is not rostered' })
    }
    if (queueRow.games?.status !== 'completed') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Game must be completed' })
    }

    const now = new Date().toISOString()
    const nextConfirmedAt = queueRow.attendance_confirmed_at ?? now

    const { error: updateError } = await supabaseAdmin
      .from('game_queue')
      .update({
        attendance_confirmed_at: nextConfirmedAt,
        no_show_at: null,
        no_show_by: null,
        tardy_at: null,
        tardy_by: null,
      })
      .eq('id', input.queueId)

    if (updateError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
    }

    return { gameId: queueRow.game_id }
  }),

  removeGuest: protectedProcedure
    .input(confirmGuestInput)
    .mutation(async ({ ctx, input }) => {
      const { data: queueRow, error: queueFetchError } = await supabaseAdmin
        .from('game_queue')
        .select('game_id, profile_id, status, added_by_profile_id')
        .eq('id', input.queueId)
        .maybeSingle()

      if (queueFetchError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: queueFetchError.message })
      }
      if (!queueRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Queue entry not found' })
      }
      if (queueRow.profile_id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Queue entry is not a guest' })
      }

      const admin = await isUserAdmin(ctx.supabase, ctx.user.id)
      if (!admin && queueRow.added_by_profile_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the adder can remove this guest' })
      }

      const { data, error } = await supabaseAdmin.rpc('admin_remove_queue_entry', {
        p_queue_id: input.queueId,
      })

      if (error) throw mapRpcError(error)

      const result = data as RpcResult | null
      unwrapRpcResult(result)

      const promotedProfileId = result?.promoted_profile_id ?? null
      const promotedGuestQueueId = result?.promoted_guest_queue_id ?? null
      if (promotedProfileId) {
        await safelyNotify(() =>
          notifyWaitlistPromoted({ supabaseAdmin, gameId: queueRow.game_id, profileId: promotedProfileId })
        )
      }
      if (promotedGuestQueueId) {
        await safelyNotify(() =>
          notifyGuestNeedsConfirmation({
            supabaseAdmin,
            gameId: queueRow.game_id,
            guestQueueId: promotedGuestQueueId,
          })
        )
      }

      await resetDraftIfNeeded({
        gameId: queueRow.game_id,
        actorId: ctx.user.id,
        rosterChanged: queueRow.status === 'rostered',
      })

      return { gameId: queueRow.game_id }
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
      const promotedGuestQueueId = result?.promoted_guest_queue_id ?? null
      if (promotedProfileId) {
        await safelyNotify(() =>
          notifyWaitlistPromoted({ supabaseAdmin, gameId: queueRow.game_id, profileId: promotedProfileId })
        )
      }
      if (promotedGuestQueueId) {
        await safelyNotify(() =>
          notifyGuestNeedsConfirmation({
            supabaseAdmin,
            gameId: queueRow.game_id,
            guestQueueId: promotedGuestQueueId,
          })
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
