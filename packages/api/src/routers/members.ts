import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import { ensureOwner } from '../utils/ensureOwner'

const removeMemberInput = z.object({
  profileId: z.string().uuid(),
})

const updateRoleInput = z.object({
  profileId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']),
})

const getOwnerCount = async () => {
  const { count, error } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'owner')

  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    })
  }

  return count ?? 0
}

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
    await ensureOwner(ctx.supabase, ctx.user.id)

    const communityId = await getDefaultCommunityId()

    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', input.profileId)
      .maybeSingle()

    if (targetError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: targetError.message,
      })
    }
    if (!targetProfile) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Member not found.',
      })
    }
    if (targetProfile.role === 'owner') {
      const ownerCount = await getOwnerCount()
      if (ownerCount <= 1) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'At least one owner is required.',
        })
      }
    }

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

  updateRole: protectedProcedure.input(updateRoleInput).mutation(async ({ ctx, input }) => {
    await ensureOwner(ctx.supabase, ctx.user.id)

    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', input.profileId)
      .maybeSingle()

    if (targetError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: targetError.message,
      })
    }
    if (!targetProfile) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Member not found.',
      })
    }
    if (targetProfile.role === input.role) {
      return { success: true }
    }

    if (targetProfile.role === 'owner' && input.role !== 'owner') {
      const ownerCount = await getOwnerCount()
      if (ownerCount <= 1) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'At least one owner is required.',
        })
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: input.role })
      .eq('id', input.profileId)

    if (updateError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: updateError.message,
      })
    }

    return { success: true }
  }),
})
