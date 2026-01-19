import type { SupabaseClient } from '@supabase/supabase-js'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import type { Database } from '@my/supabase/types'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import { ensureAdmin } from '../utils/ensureAdmin'

type CommunityRow = Database['public']['Tables']['communities']['Row']

const communityFields = `
  id,
  community_timezone,
  community_priority_enabled,
  confirmation_window_hours_before_kickoff,
  confirmation_reminders_local_times,
  crunch_time_enabled,
  crunch_time_start_time_local,
  game_notification_times_local,
  community_banner_url
`

const updateDefaultsInput = z.object({
  communityTimezone: z.string().min(1).optional(),
  communityPriorityEnabled: z.boolean().optional(),
  confirmationWindowHoursBeforeKickoff: z.number().int().min(0).optional(),
  confirmationRemindersLocalTimes: z.array(z.string()).optional(),
  crunchTimeEnabled: z.boolean().optional(),
  crunchTimeStartTimeLocal: z.string().min(1).optional(),
  gameNotificationTimesLocal: z.array(z.string()).optional(),
  communityBannerUrl: z.string().min(1).optional(),
})

const fetchDefaultCommunity = async (supabase: SupabaseClient<Database>) => {
  const { data, error } = await supabase
    .from('communities')
    .select(communityFields)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }
  if (!data) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Community defaults not found' })
  }

  return data as CommunityRow
}

export const communityRouter = createTRPCRouter({
  defaults: protectedProcedure.query(async ({ ctx }) => {
    const row = await fetchDefaultCommunity(ctx.supabase)
    return {
      id: row.id,
      timezone: row.community_timezone,
      communityPriorityEnabled: row.community_priority_enabled,
      confirmationWindowHoursBeforeKickoff: row.confirmation_window_hours_before_kickoff,
      confirmationRemindersLocalTimes: row.confirmation_reminders_local_times,
      crunchTimeEnabled: row.crunch_time_enabled,
      crunchTimeStartTimeLocal: row.crunch_time_start_time_local,
      gameNotificationTimesLocal: row.game_notification_times_local,
      bannerUrl: row.community_banner_url,
    }
  }),

  updateDefaults: protectedProcedure.input(updateDefaultsInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const { data: communityRow, error: communityError } = await ctx.supabase
      .from('communities')
      .select('id, crunch_time_start_time_local')
      .limit(1)
      .maybeSingle()

    if (communityError || !communityRow) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: communityError?.message ?? 'Unable to load community defaults',
      })
    }

    const resetCrunchNotice =
      input.crunchTimeStartTimeLocal !== undefined &&
      communityRow.crunch_time_start_time_local !== input.crunchTimeStartTimeLocal

    const payload: Database['public']['Tables']['communities']['Update'] = {}
    if (input.communityTimezone !== undefined) payload.community_timezone = input.communityTimezone
    if (input.communityPriorityEnabled !== undefined) {
      payload.community_priority_enabled = input.communityPriorityEnabled
    }
    if (input.confirmationWindowHoursBeforeKickoff !== undefined) {
      payload.confirmation_window_hours_before_kickoff = input.confirmationWindowHoursBeforeKickoff
    }
    if (input.confirmationRemindersLocalTimes !== undefined) {
      payload.confirmation_reminders_local_times = input.confirmationRemindersLocalTimes
    }
    if (input.crunchTimeEnabled !== undefined) payload.crunch_time_enabled = input.crunchTimeEnabled
    if (input.crunchTimeStartTimeLocal !== undefined) {
      payload.crunch_time_start_time_local = input.crunchTimeStartTimeLocal
    }
    if (input.gameNotificationTimesLocal !== undefined) {
      payload.game_notification_times_local = input.gameNotificationTimesLocal
    }
    if (input.communityBannerUrl !== undefined) {
      payload.community_banner_url = input.communityBannerUrl
    }

    const { data, error } = await supabaseAdmin
      .from('communities')
      .update(payload)
      .eq('id', communityRow.id)
      .select(communityFields)
      .maybeSingle()

    if (error || !data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error?.message ?? 'Unable to update community defaults',
      })
    }

    if (resetCrunchNotice) {
      const { error: resetError } = await supabaseAdmin
        .from('games')
        .update({ crunch_time_notice_sent_at: null })
        .eq('community_id', communityRow.id)
        .eq('status', 'scheduled')
        .is('crunch_time_start_time_local', null)

      if (resetError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: resetError.message,
        })
      }
    }

    return {
      id: data.id,
      timezone: data.community_timezone,
      communityPriorityEnabled: data.community_priority_enabled,
      confirmationWindowHoursBeforeKickoff: data.confirmation_window_hours_before_kickoff,
      confirmationRemindersLocalTimes: data.confirmation_reminders_local_times,
      crunchTimeEnabled: data.crunch_time_enabled,
      crunchTimeStartTimeLocal: data.crunch_time_start_time_local,
      gameNotificationTimesLocal: data.game_notification_times_local,
      bannerUrl: data.community_banner_url,
    }
  }),
})
