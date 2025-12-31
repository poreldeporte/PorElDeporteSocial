import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'

const registerInput = z.object({
  expoPushToken: z.string().min(1),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string().nullable().optional(),
})

const unregisterInput = z.object({
  expoPushToken: z.string().min(1),
})

export const notificationsRouter = createTRPCRouter({
  registerDevice: protectedProcedure.input(registerInput).mutation(async ({ ctx, input }) => {
    const { error } = await supabaseAdmin
      .from('user_devices')
      .upsert(
        {
          user_id: ctx.user.id,
          expo_push_token: input.expoPushToken,
          platform: input.platform,
          app_version: input.appVersion ?? null,
          last_seen_at: new Date().toISOString(),
          disabled_at: null,
        },
        { onConflict: 'expo_push_token' }
      )

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { ok: true }
  }),

  unregisterDevice: protectedProcedure.input(unregisterInput).mutation(async ({ ctx, input }) => {
    const { error } = await supabaseAdmin
      .from('user_devices')
      .update({ disabled_at: new Date().toISOString() })
      .eq('expo_push_token', input.expoPushToken)
      .eq('user_id', ctx.user.id)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { ok: true }
  }),
})
