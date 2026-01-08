import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import { ensureAdmin } from '../utils/ensureAdmin'

const removeMemberInput = z.object({
  profileId: z.string().uuid(),
})

const getDefaultCommunityId = async () => {
  const { data, error } = await supabaseAdmin
    .from('communities')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data?.id) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error?.message ?? 'Unable to load community.',
    })
  }

  return data.id
}

export const membersRouter = createTRPCRouter({
  remove: protectedProcedure.input(removeMemberInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const communityId = await getDefaultCommunityId()

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ approval_status: 'pending' })
      .eq('id', input.profileId)

    if (profileError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: profileError.message,
      })
    }

    const { error: membershipError } = await supabaseAdmin
      .from('memberships')
      .delete()
      .eq('community_id', communityId)
      .eq('profile_id', input.profileId)

    if (membershipError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: membershipError.message,
      })
    }

    return { success: true }
  }),
})
