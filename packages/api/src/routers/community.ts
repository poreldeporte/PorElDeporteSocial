import type { SupabaseClient } from '@supabase/supabase-js'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import type { Database } from '@my/supabase/types'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import { ensureAdmin } from '../utils/ensureAdmin'

type CommunityRow = Database['public']['Tables']['communities']['Row'] & {
  community_logo_url?: string | null
  community_primary_color?: string | null
  sports?: string[] | null
}
type CommunityUpdate = Database['public']['Tables']['communities']['Update'] & {
  community_logo_url?: string | null
  community_primary_color?: string | null
  name_normalized?: string | null
  sports?: string[] | null
}

const communityFields = `
  id,
  name,
  city,
  state,
  sport,
  sports,
  description,
  contact_email,
  contact_phone,
  website_url,
  instagram_url,
  x_url,
  youtube_url,
  tiktok_url,
  community_timezone,
  community_priority_enabled,
  confirmation_window_hours_before_kickoff,
  confirmation_reminders_local_times,
  crunch_time_enabled,
  crunch_time_start_time_local,
  game_notification_times_local,
  community_banner_url,
  community_logo_url,
  community_primary_color
`

const communityBrandingFields = `
  id,
  community_logo_url,
  community_primary_color
`

const communityListFields = `
  id,
  name,
  city,
  state,
  sport,
  sports,
  description,
  contact_email,
  contact_phone,
  website_url,
  instagram_url,
  x_url,
  youtube_url,
  tiktok_url,
  community_logo_url,
  community_primary_color
`

const communityIdInput = z.object({
  communityId: z.string().uuid(),
})

const COMMUNITY_SPORTS = [
  'Fútbol',
  'Basketball',
  'Volleyball',
  'Pickleball',
  'Padel',
  'Other',
] as const

const COMMUNITY_NAME_MIN = 3
const COMMUNITY_NAME_MAX = 40
const COMMUNITY_NAME_PATTERN = /^[\p{L}\p{N} ]+$/u

const normalizeCommunityName = (value: string) => value.trim().replace(/\s+/g, ' ')
const normalizeCommunityNameKey = (value: string) =>
  normalizeCommunityName(value).toLocaleLowerCase()
const normalizeSportsList = (sports: (typeof COMMUNITY_SPORTS)[number][]) => {
  const unique = new Set(sports)
  return COMMUNITY_SPORTS.filter((sport) => unique.has(sport))
}

const getValidatedCommunityName = (value: string) => {
  const normalized = normalizeCommunityName(value)
  if (normalized.length < COMMUNITY_NAME_MIN || normalized.length > COMMUNITY_NAME_MAX) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Community name must be ${COMMUNITY_NAME_MIN}-${COMMUNITY_NAME_MAX} characters.`,
    })
  }
  if (!COMMUNITY_NAME_PATTERN.test(normalized)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Community name can only include letters, numbers, and spaces.',
    })
  }
  return { name: normalized, normalizedKey: normalizeCommunityNameKey(normalized) }
}

const assertCommunityNameAvailable = async ({
  normalizedKey,
  excludeId,
}: {
  normalizedKey: string
  excludeId?: string
}) => {
  let query = supabaseAdmin
    .from('communities')
    .select('id')
    .eq('name_normalized', normalizedKey)
    .limit(1)
  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }
  if (data) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Community name is already taken.',
    })
  }
}

const createCommunityInput = z.object({
  name: z.string().min(COMMUNITY_NAME_MIN).max(COMMUNITY_NAME_MAX),
  city: z.string().min(1),
  state: z.string().min(1),
  sports: z.array(z.enum(COMMUNITY_SPORTS)).min(1),
  description: z.string().max(160).optional().nullable(),
  primaryColor: z.string().min(1).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().min(1).optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  instagramUrl: z.string().url().optional().nullable(),
  xUrl: z.string().url().optional().nullable(),
  youtubeUrl: z.string().url().optional().nullable(),
  tiktokUrl: z.string().url().optional().nullable(),
})

const updateDefaultsInput = communityIdInput.extend({
  communityName: z.string().min(1).optional(),
  communityCity: z.string().min(1).nullable().optional(),
  communityState: z.string().min(1).nullable().optional(),
  communitySport: z.string().min(1).nullable().optional(),
  communitySports: z.array(z.enum(COMMUNITY_SPORTS)).optional(),
  communityDescription: z.string().min(1).nullable().optional(),
  communityContactEmail: z.string().email().nullable().optional(),
  communityContactPhone: z.string().min(1).nullable().optional(),
  communityWebsiteUrl: z.string().url().nullable().optional(),
  communityInstagramUrl: z.string().url().nullable().optional(),
  communityXUrl: z.string().url().nullable().optional(),
  communityYoutubeUrl: z.string().url().nullable().optional(),
  communityTiktokUrl: z.string().url().nullable().optional(),
  communityTimezone: z.string().min(1).optional(),
  communityPriorityEnabled: z.boolean().optional(),
  confirmationWindowHoursBeforeKickoff: z.number().int().min(0).optional(),
  confirmationRemindersLocalTimes: z.array(z.string()).optional(),
  crunchTimeEnabled: z.boolean().optional(),
  crunchTimeStartTimeLocal: z.string().min(1).optional(),
  gameNotificationTimesLocal: z.array(z.string()).optional(),
  communityBannerUrl: z.string().min(1).nullable().optional(),
  communityLogoUrl: z.string().min(1).nullable().optional(),
  communityPrimaryColor: z.string().min(1).nullable().optional(),
})

const fetchCommunity = async (supabase: SupabaseClient<Database>, communityId: string) => {
  const { data, error } = await supabase
    .from('communities')
    .select(communityFields)
    .eq('id', communityId)
    .maybeSingle()

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }
  if (!data) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Community defaults not found' })
  }

  return data as CommunityRow
}

const fetchCommunityBranding = async (communityId: string) => {
  const { data, error } = await supabaseAdmin
    .from('communities')
    .select(communityBrandingFields)
    .eq('id', communityId)
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
  listPublic: publicProcedure.query(async () => {
    const { data, error } = await supabaseAdmin
      .from('communities')
      .select(communityListFields)
      .is('archived_at', null)
      .order('name', { ascending: true })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    const rows = (data ?? []) as CommunityRow[]
    const communityIds = rows.map((row) => row.id).filter(Boolean)
    let countsMap = new Map<string, number>()

    if (communityIds.length > 0) {
      const { data: countsData, error: countsError } = await supabaseAdmin
        .from('memberships')
        .select('community_id')
        .in('community_id', communityIds)
        .eq('status', 'approved')

      if (countsError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: countsError.message })
      }

      countsMap = (countsData ?? []).reduce((map, row) => {
        if (!row.community_id) return map
        map.set(row.community_id, (map.get(row.community_id) ?? 0) + 1)
        return map
      }, new Map<string, number>())
    }

    return rows
      .map((row) => ({
      id: row.id,
      name: row.name ?? 'Community',
      city: row.city ?? null,
      state: row.state ?? null,
      sport: row.sport ?? null,
      sports: row.sports ?? null,
      description: row.description ?? null,
      contactEmail: row.contact_email ?? null,
      contactPhone: row.contact_phone ?? null,
      websiteUrl: row.website_url ?? null,
      instagramUrl: row.instagram_url ?? null,
      xUrl: row.x_url ?? null,
      youtubeUrl: row.youtube_url ?? null,
      tiktokUrl: row.tiktok_url ?? null,
      community_logo_url: row.community_logo_url ?? null,
      community_primary_color: row.community_primary_color ?? null,
      memberCount: countsMap.get(row.id) ?? 0,
      }))
      .filter((row) => row.memberCount > 0)
  }),
  create: protectedProcedure.input(createCommunityInput).mutation(async ({ ctx, input }) => {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, created_community_id')
      .eq('id', ctx.user.id)
      .maybeSingle()

    if (profileError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: profileError.message })
    }
    if (!profile) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found.' })
    }
    if (profile.created_community_id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You already created a community.',
      })
    }

    const { name, normalizedKey } = getValidatedCommunityName(input.name)
    await assertCommunityNameAvailable({ normalizedKey })

    const description = input.description?.trim() || null
    const primaryColor = input.primaryColor?.trim() || null
    const sports = normalizeSportsList(input.sports)
    const primarySport = sports[0] ?? null

    const payload: CommunityUpdate = {
      name,
      name_normalized: normalizedKey,
      city: input.city.trim(),
      state: input.state.trim().toUpperCase(),
      sport: primarySport,
      sports,
      description,
      contact_email: input.contactEmail?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
      website_url: input.websiteUrl?.trim() || null,
      instagram_url: input.instagramUrl?.trim() || null,
      x_url: input.xUrl?.trim() || null,
      youtube_url: input.youtubeUrl?.trim() || null,
      tiktok_url: input.tiktokUrl?.trim() || null,
      community_primary_color: primaryColor,
    }

    const { data: community, error: communityError } = await supabaseAdmin
      .from('communities')
      .insert(payload)
      .select('id')
      .maybeSingle()

    if (communityError || !community) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: communityError?.message ?? 'Unable to create community.',
      })
    }

    const nowIso = new Date().toISOString()
    const { error: membershipError } = await supabaseAdmin.from('memberships').insert({
      community_id: community.id,
      profile_id: ctx.user.id,
      status: 'approved',
      role: 'owner',
      requested_at: nowIso,
    })

    if (membershipError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: membershipError.message,
      })
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        created_community_id: community.id,
        favorite_community_id: community.id,
      })
      .eq('id', ctx.user.id)

    if (profileUpdateError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: profileUpdateError.message,
      })
    }

    return { communityId: community.id }
  }),
  defaults: protectedProcedure.input(communityIdInput).query(async ({ ctx, input }) => {
    const row = await fetchCommunity(ctx.supabase, input.communityId)
    return {
      id: row.id,
      name: row.name,
      city: row.city,
      state: row.state,
      sport: row.sport,
      sports: row.sports,
      description: row.description,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      websiteUrl: row.website_url,
      instagramUrl: row.instagram_url,
      xUrl: row.x_url,
      youtubeUrl: row.youtube_url,
      tiktokUrl: row.tiktok_url,
      timezone: row.community_timezone,
      communityPriorityEnabled: row.community_priority_enabled,
      confirmationWindowHoursBeforeKickoff: row.confirmation_window_hours_before_kickoff,
      confirmationRemindersLocalTimes: row.confirmation_reminders_local_times,
      crunchTimeEnabled: row.crunch_time_enabled,
      crunchTimeStartTimeLocal: row.crunch_time_start_time_local,
      gameNotificationTimesLocal: row.game_notification_times_local,
      bannerUrl: row.community_banner_url,
      logoUrl: row.community_logo_url,
      primaryColor: row.community_primary_color,
    }
  }),

  branding: publicProcedure.input(communityIdInput).query(async ({ input }) => {
    const row = await fetchCommunityBranding(input.communityId)
    return {
      logoUrl: row.community_logo_url,
      primaryColor: row.community_primary_color,
    }
  }),

  updateDefaults: protectedProcedure.input(updateDefaultsInput).mutation(async ({ ctx, input }) => {
    await ensureAdmin(ctx.supabase, ctx.user.id, input.communityId)

    const { data: communityRow, error: communityError } = await ctx.supabase
      .from('communities')
      .select('id, crunch_time_start_time_local, sports')
      .eq('id', input.communityId)
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

    const payload: CommunityUpdate = {}
    if (input.communityName !== undefined) {
      const { name, normalizedKey } = getValidatedCommunityName(input.communityName)
      await assertCommunityNameAvailable({
        normalizedKey,
        excludeId: input.communityId,
      })
      payload.name = name
      payload.name_normalized = normalizedKey
    }
    if (input.communityCity !== undefined) {
      payload.city = input.communityCity?.trim() || null
    }
    if (input.communityState !== undefined) {
      payload.state = input.communityState?.trim().toUpperCase() || null
    }
    if (input.communitySport !== undefined) {
      payload.sport = input.communitySport?.trim() || null
    }
    if (input.communitySports !== undefined) {
      const sports = normalizeSportsList(input.communitySports)
      payload.sports = sports.length ? sports : null
    } else if (
      input.communitySport !== undefined &&
      (!communityRow.sports || communityRow.sports.length <= 1)
    ) {
      const nextSport = input.communitySport?.trim() || null
      payload.sports = nextSport ? [nextSport] : null
    }
    if (input.communityDescription !== undefined) {
      payload.description = input.communityDescription?.trim() || null
    }
    if (input.communityContactEmail !== undefined) {
      payload.contact_email = input.communityContactEmail?.trim() || null
    }
    if (input.communityContactPhone !== undefined) {
      payload.contact_phone = input.communityContactPhone?.trim() || null
    }
    if (input.communityWebsiteUrl !== undefined) {
      payload.website_url = input.communityWebsiteUrl?.trim() || null
    }
    if (input.communityInstagramUrl !== undefined) {
      payload.instagram_url = input.communityInstagramUrl?.trim() || null
    }
    if (input.communityXUrl !== undefined) {
      payload.x_url = input.communityXUrl?.trim() || null
    }
    if (input.communityYoutubeUrl !== undefined) {
      payload.youtube_url = input.communityYoutubeUrl?.trim() || null
    }
    if (input.communityTiktokUrl !== undefined) {
      payload.tiktok_url = input.communityTiktokUrl?.trim() || null
    }
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
    if (input.communityLogoUrl !== undefined) {
      payload.community_logo_url = input.communityLogoUrl
    }
    if (input.communityPrimaryColor !== undefined) {
      payload.community_primary_color = input.communityPrimaryColor
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
      name: data.name,
      city: data.city,
      state: data.state,
      sport: data.sport,
      sports: data.sports,
      description: data.description,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      websiteUrl: data.website_url,
      instagramUrl: data.instagram_url,
      xUrl: data.x_url,
      youtubeUrl: data.youtube_url,
      tiktokUrl: data.tiktok_url,
      timezone: data.community_timezone,
      communityPriorityEnabled: data.community_priority_enabled,
      confirmationWindowHoursBeforeKickoff: data.confirmation_window_hours_before_kickoff,
      confirmationRemindersLocalTimes: data.confirmation_reminders_local_times,
      crunchTimeEnabled: data.crunch_time_enabled,
      crunchTimeStartTimeLocal: data.crunch_time_start_time_local,
      gameNotificationTimesLocal: data.game_notification_times_local,
      bannerUrl: data.community_banner_url,
      logoUrl: data.community_logo_url,
      primaryColor: data.community_primary_color,
    }
  }),
})
