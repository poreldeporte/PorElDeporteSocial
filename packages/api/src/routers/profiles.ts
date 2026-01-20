import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, protectedProcedure } from '../trpc'

export const profilesRouter = createTRPCRouter({
  byId: protectedProcedure
    .input(z.object({ profileId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('profiles')
        .select('id, phone, nationality')
        .eq('id', input.profileId)
        .maybeSingle()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      if (!data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found.' })
      }

      return {
        id: data.id,
        phone: data.phone ?? null,
        nationality: data.nationality ?? null,
      }
    }),
})
