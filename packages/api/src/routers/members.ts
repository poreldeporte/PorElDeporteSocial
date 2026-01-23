import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import { ensureAdmin } from '../utils/ensureAdmin'
import { ensureOwner } from '../utils/ensureOwner'

const communityInput = z.object({
  communityId: z.string().uuid(),
})

const removeMemberInput = communityInput.extend({
  profileId: z.string().uuid(),
})

const updateRoleInput = communityInput.extend({
  profileId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']),
})

const reviewMemberInput = communityInput.extend({
  profileId: z.string().uuid(),
})

const requestMembershipInput = communityInput.extend({
  inviteCode: z.string().trim().min(1).nullable().optional(),
})

const REQUEST_COOLDOWN_MS = 10 * 60 * 1000

const getOwnerCount = async (communityId: string) => {
  const { count, error } = await supabaseAdmin
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('status', 'approved')
    .eq('role', 'owner')

  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    })
  }

  return count ?? 0
}

export const membersRouter = createTRPCRouter({
  remove: protectedProcedure.input(removeMemberInput).mutation(async ({ ctx, input }) => {
    await ensureOwner(ctx.supabase, ctx.user.id, input.communityId)

    const { data: targetMembership, error: targetError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('community_id', input.communityId)
      .eq('profile_id', input.profileId)
      .maybeSingle()

    if (targetError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: targetError.message,
      })
    }
    if (!targetMembership) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Member not found.',
      })
    }
    if (targetMembership.role === 'owner') {
      const ownerCount = await getOwnerCount(input.communityId)
      if (ownerCount <= 1) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'At least one owner is required.',
        })
      }
    }

    const { error: membershipError } = await supabaseAdmin
      .from('memberships')
      .update({ status: 'rejected' })
      .eq('community_id', input.communityId)
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
    await ensureOwner(ctx.supabase, ctx.user.id, input.communityId)

    const { data: targetMembership, error: targetError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('community_id', input.communityId)
      .eq('profile_id', input.profileId)
      .maybeSingle()

    if (targetError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: targetError.message,
      })
    }
    if (!targetMembership) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Member not found.',
      })
    }
    if (targetMembership.role === input.role) {
      return { success: true }
    }

    if (targetMembership.role === 'owner' && input.role !== 'owner') {
      const ownerCount = await getOwnerCount(input.communityId)
      if (ownerCount <= 1) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'At least one owner is required.',
        })
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('memberships')
      .update({ role: input.role })
      .eq('community_id', input.communityId)
      .eq('profile_id', input.profileId)

    if (updateError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: updateError.message,
      })
    }

    return { success: true }
  }),

  list: protectedProcedure.input(communityInput).query(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id, input.communityId)

    const { data, error } = await supabaseAdmin
      .from('memberships')
      .select(
        `
        id,
        profile_id,
        role,
        status,
        profiles!memberships_profile_id_fkey (
          id,
          avatar_url,
          first_name,
          last_name,
          name,
          email,
          phone,
          position,
          jersey_number
        )
      `
      )
      .eq('community_id', input.communityId)
      .eq('status', 'approved')

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })
    }

    const rows = data ?? []
    return rows
      .map((row) => {
        const profile = row.profiles
        return {
          id: profile?.id ?? row.profile_id,
          avatar_url: profile?.avatar_url ?? null,
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
          name: profile?.name ?? null,
          email: profile?.email ?? null,
          phone: profile?.phone ?? null,
          position: profile?.position ?? null,
          jersey_number: profile?.jersey_number ?? null,
          role: row.role ?? 'member',
        }
      })
      .sort((a, b) => {
        const nameA = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim()
        const nameB = `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim()
        return nameA.localeCompare(nameB)
      })
  }),

  pending: protectedProcedure.input(communityInput).query(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id, input.communityId)

    const { data, error } = await supabaseAdmin
      .from('memberships')
      .select(
        `
        id,
        profile_id,
        status,
        requested_at,
        profiles!memberships_profile_id_fkey (
          id,
          first_name,
          last_name,
          name,
          email,
          phone,
          position,
          jersey_number,
          birth_date
        )
      `
      )
      .eq('community_id', input.communityId)
      .eq('status', 'pending')

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })
    }

    const rows = data ?? []
    return rows
      .map((row) => {
        const profile = row.profiles
        return {
          id: profile?.id ?? row.profile_id,
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
          name: profile?.name ?? null,
          email: profile?.email ?? null,
          phone: profile?.phone ?? null,
          position: profile?.position ?? null,
          jersey_number: profile?.jersey_number ?? null,
          birth_date: profile?.birth_date ?? null,
          requested_at: row.requested_at ?? null,
        }
      })
      .filter((profile) => {
        return (
          profile.first_name &&
          profile.last_name &&
          profile.email &&
          profile.position &&
          profile.jersey_number &&
          profile.birth_date
        )
      })
      .sort((a, b) => {
        const nameA = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim()
        const nameB = `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim()
        return nameA.localeCompare(nameB)
      })
  }),

  pendingCount: protectedProcedure.input(communityInput).query(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id, input.communityId)

    const { count, error } = await supabaseAdmin
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', input.communityId)
      .eq('status', 'pending')

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })
    }

    return count ?? 0
  }),

  approve: protectedProcedure.input(reviewMemberInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id, input.communityId)

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('id, status')
      .eq('community_id', input.communityId)
      .eq('profile_id', input.profileId)
      .maybeSingle()

    if (membershipError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: membershipError.message,
      })
    }
    if (!membership) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Membership not found.',
      })
    }
    if (membership.status === 'approved') {
      return { success: true }
    }

    const { error: updateError } = await supabaseAdmin
      .from('memberships')
      .update({ status: 'approved' })
      .eq('id', membership.id)

    if (updateError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: updateError.message,
      })
    }

    return { success: true }
  }),

  reject: protectedProcedure.input(reviewMemberInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id, input.communityId)

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('id, status')
      .eq('community_id', input.communityId)
      .eq('profile_id', input.profileId)
      .maybeSingle()

    if (membershipError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: membershipError.message,
      })
    }
    if (!membership) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Membership not found.',
      })
    }
    if (membership.status === 'rejected') {
      return { success: true }
    }

    const { error: updateError } = await supabaseAdmin
      .from('memberships')
      .update({ status: 'rejected' })
      .eq('id', membership.id)

    if (updateError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: updateError.message,
      })
    }

    return { success: true }
  }),

  request: protectedProcedure.input(requestMembershipInput).mutation(async ({ ctx, input }) => {
    const now = new Date()
    const nowIso = now.toISOString()

    const { data: community, error: communityError } = await supabaseAdmin
      .from('communities')
      .select('id')
      .eq('id', input.communityId)
      .maybeSingle()

    if (communityError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: communityError.message,
      })
    }
    if (!community) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Community not found.' })
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('memberships')
      .select('id, status, requested_at')
      .eq('community_id', input.communityId)
      .eq('profile_id', ctx.user.id)
      .maybeSingle()

    if (existingError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: existingError.message,
      })
    }

    if (existing?.status === 'approved') {
      return { status: 'approved' as const }
    }

    const lastRequestedAt = existing?.requested_at ? new Date(existing.requested_at).getTime() : 0
    if (lastRequestedAt && now.getTime() - lastRequestedAt < REQUEST_COOLDOWN_MS) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Please wait a bit before requesting again.',
      })
    }

    if (existing?.id) {
      const { error: updateError } = await supabaseAdmin
        .from('memberships')
        .update({ status: 'pending', requested_at: nowIso })
        .eq('id', existing.id)

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: updateError.message,
        })
      }

      return { status: 'pending' as const }
    }

    const { error: insertError } = await supabaseAdmin.from('memberships').insert({
      community_id: input.communityId,
      profile_id: ctx.user.id,
      status: 'pending',
      role: 'member',
      requested_at: nowIso,
    })

    if (insertError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: insertError.message,
      })
    }

    return { status: 'pending' as const }
  }),

  myMemberships: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await supabaseAdmin
      .from('memberships')
      .select(
        `
        id,
        community_id,
        role,
        status,
        requested_at,
        communities!memberships_community_id_fkey (
          id,
          name,
          city,
          sports,
          state,
          sport,
          description,
          archived_at,
          community_logo_url,
          community_primary_color
        )
      `
      )
      .eq('profile_id', ctx.user.id)
      .order('created_at', { ascending: true })

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })
    }

    const rows = data ?? []
    const communityIds = Array.from(
      new Set(rows.map((row) => row.community_id).filter((id): id is string => Boolean(id)))
    )
    let countsMap = new Map<string, number>()

    if (communityIds.length > 0) {
      const { data: countsData, error: countsError } = await supabaseAdmin
        .from('memberships')
        .select('community_id, status')
        .in('community_id', communityIds)
        .eq('status', 'approved')

      if (countsError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: countsError.message,
        })
      }

      countsMap = (countsData ?? []).reduce((map, row) => {
        if (!row.community_id) return map
        map.set(row.community_id, (map.get(row.community_id) ?? 0) + 1)
        return map
      }, new Map<string, number>())
    }

    return rows.map((row) => ({
      id: row.id,
      communityId: row.community_id,
      role: row.role ?? 'member',
      status: row.status ?? 'pending',
      requestedAt: row.requested_at ?? null,
          community: row.communities
        ? {
            id: row.communities.id,
            name: row.communities.name ?? 'Community',
            city: row.communities.city ?? null,
            state: row.communities.state ?? null,
            sport: row.communities.sport ?? null,
            sports: row.communities.sports ?? null,
            description: row.communities.description ?? null,
            logoUrl: row.communities.community_logo_url ?? null,
            primaryColor: row.communities.community_primary_color ?? null,
            archivedAt: row.communities.archived_at ?? null,
            memberCount: countsMap.get(row.communities.id) ?? 0,
          }
        : null,
    }))
  }),
})
