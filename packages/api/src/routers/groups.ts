import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import { ensureAdmin } from '../utils/ensureAdmin'
import { notifyGuestNeedsConfirmation, notifyWaitlistPromoted } from '../services/notifications'
import { resetDraftForGame } from '../services/draft'

const createGroupInput = z.object({
  name: z.string().trim().min(2, 'Group name is required'),
  memberIds: z.array(z.string().uuid()).default([]),
})

const updateGroupInput = createGroupInput.extend({
  id: z.string().uuid(),
})

const groupIdInput = z.object({
  id: z.string().uuid(),
})

type RpcResult = {
  status: string
  promoted_profile_id?: string | null
  promoted_guest_queue_id?: string | null
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

const safelyNotify = async (action: () => Promise<void>) => {
  try {
    await action()
  } catch {
    return
  }
}

const resetDraftsIfNeeded = async ({
  gameIds,
  actorId,
}: {
  gameIds: string[]
  actorId: string
}) => {
  if (gameIds.length === 0) return

  for (const gameId of gameIds) {
    const { data, error } = await supabaseAdmin
      .from('games')
      .select('draft_status')
      .eq('id', gameId)
      .maybeSingle()

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    if (!data?.draft_status || data.draft_status === 'pending') {
      continue
    }

    await resetDraftForGame({
      gameId,
      supabaseAdmin,
      actorId,
      preserveCaptains: false,
    })
  }
}

const removeMembersFromUpcomingGroupGames = async ({
  groupId,
  removedProfileIds,
  actorId,
}: {
  groupId: string
  removedProfileIds: string[]
  actorId: string
}) => {
  if (removedProfileIds.length === 0) return

  const nowIso = new Date().toISOString()
  const { data: games, error: gamesError } = await supabaseAdmin
    .from('games')
    .select('id')
    .eq('audience_group_id', groupId)
    .eq('status', 'scheduled')
    .gt('start_time', nowIso)

  if (gamesError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: gamesError.message })
  }

  const gameIds = (games ?? []).map((game) => game.id)
  if (gameIds.length === 0) return

  const removedCsv = removedProfileIds.join(',')
  const { data: queueRows, error: queueError } = await supabaseAdmin
    .from('game_queue')
    .select('id, game_id, status')
    .in('game_id', gameIds)
    .or(`profile_id.in.(${removedCsv}),added_by_profile_id.in.(${removedCsv})`)

  if (queueError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: queueError.message })
  }

  const rosterChanged = new Set<string>()
  for (const row of queueRows ?? []) {
    const { data, error } = await supabaseAdmin.rpc('admin_remove_queue_entry', {
      p_queue_id: row.id,
    })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    const result = data as RpcResult | null
    const promotedProfileId = result?.promoted_profile_id ?? null
    const promotedGuestQueueId = result?.promoted_guest_queue_id ?? null

    if (promotedProfileId) {
      await safelyNotify(() =>
        notifyWaitlistPromoted({
          supabaseAdmin,
          gameId: row.game_id,
          profileId: promotedProfileId,
        })
      )
    }

    if (promotedGuestQueueId) {
      await safelyNotify(() =>
        notifyGuestNeedsConfirmation({
          supabaseAdmin,
          gameId: row.game_id,
          guestQueueId: promotedGuestQueueId,
        })
      )
    }

    if (row.status === 'rostered') {
      rosterChanged.add(row.game_id)
    }
  }

  await resetDraftsIfNeeded({ gameIds: Array.from(rosterChanged), actorId })
}

export const groupsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const communityId = await getDefaultCommunityId()
    const { data, error } = await supabaseAdmin
      .from('community_groups')
      .select('id, name, created_at')
      .eq('community_id', communityId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    const groups = data ?? []
    if (groups.length === 0) return []

    const groupIds = groups.map((group) => group.id)
    const { data: members, error: membersError } = await supabaseAdmin
      .from('community_group_members')
      .select('group_id')
      .in('group_id', groupIds)

    if (membersError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: membersError.message })
    }

    const counts = new Map<string, number>()
    ;(members ?? []).forEach((member) => {
      counts.set(member.group_id, (counts.get(member.group_id) ?? 0) + 1)
    })

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      createdAt: group.created_at,
      memberCount: counts.get(group.id) ?? 0,
    }))
  }),

  byId: protectedProcedure.input(groupIdInput).query(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const { data: group, error: groupError } = await supabaseAdmin
      .from('community_groups')
      .select('id, name, community_id')
      .eq('id', input.id)
      .maybeSingle()

    if (groupError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: groupError.message })
    }

    if (!group) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' })
    }

    const { data: members, error: membersError } = await supabaseAdmin
      .from('community_group_members')
      .select('profile_id')
      .eq('group_id', group.id)

    if (membersError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: membersError.message })
    }

    return {
      id: group.id,
      name: group.name,
      communityId: group.community_id,
      memberIds: (members ?? []).map((member) => member.profile_id),
    }
  }),

  create: protectedProcedure.input(createGroupInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const communityId = await getDefaultCommunityId()
    const name = input.name.trim()
    const memberIds = Array.from(new Set(input.memberIds))

    const { data: group, error: groupError } = await supabaseAdmin
      .from('community_groups')
      .insert({
        community_id: communityId,
        name,
        created_by: ctx.user.id,
      })
      .select('id')
      .maybeSingle()

    if (groupError || !group) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: groupError?.message ?? 'Unable to create group',
      })
    }

    if (memberIds.length > 0) {
      const payload = memberIds.map((profileId) => ({
        group_id: group.id,
        profile_id: profileId,
      }))
      const { error: memberError } = await supabaseAdmin
        .from('community_group_members')
        .insert(payload)

      if (memberError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: memberError.message })
      }
    }

    return { id: group.id }
  }),

  update: protectedProcedure.input(updateGroupInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id)

    const { data: group, error: groupError } = await supabaseAdmin
      .from('community_groups')
      .select('id')
      .eq('id', input.id)
      .maybeSingle()

    if (groupError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: groupError.message })
    }
    if (!group) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' })
    }

    const name = input.name.trim()
    const memberIds = Array.from(new Set(input.memberIds))

    const { error: updateError } = await supabaseAdmin
      .from('community_groups')
      .update({ name })
      .eq('id', input.id)

    if (updateError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
    }

    const { data: members, error: membersError } = await supabaseAdmin
      .from('community_group_members')
      .select('profile_id')
      .eq('group_id', input.id)

    if (membersError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: membersError.message })
    }

    const existingIds = new Set((members ?? []).map((member) => member.profile_id))
    const nextIds = new Set(memberIds)
    const toAdd = memberIds.filter((profileId) => !existingIds.has(profileId))
    const toRemove = (members ?? [])
      .map((member) => member.profile_id)
      .filter((profileId) => !nextIds.has(profileId))

    if (toAdd.length > 0) {
      const insertRows = toAdd.map((profileId) => ({
        group_id: input.id,
        profile_id: profileId,
      }))
      const { error: insertError } = await supabaseAdmin
        .from('community_group_members')
        .insert(insertRows)

      if (insertError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message })
      }
    }

    if (toRemove.length > 0) {
      const { error: removeError } = await supabaseAdmin
        .from('community_group_members')
        .delete()
        .eq('group_id', input.id)
        .in('profile_id', toRemove)

      if (removeError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: removeError.message })
      }

      await removeMembersFromUpcomingGroupGames({
        groupId: input.id,
        removedProfileIds: toRemove,
        actorId: ctx.user.id,
      })
    }

    return { ok: true }
  }),
})
