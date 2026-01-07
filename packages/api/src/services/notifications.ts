import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@my/supabase/types'

import { buildPushMessages, deliverPushMessages, type PushPayload } from './push'

type GameSummary = {
  id: string
  name: string
}

type NotifyOptions = {
  supabaseAdmin: SupabaseClient<Database>
  gameId: string
}

type ProfileName = {
  name: string | null
  first_name: string | null
  last_name: string | null
}

const fetchGameSummary = async (supabaseAdmin: SupabaseClient<Database>, gameId: string) => {
  const { data, error } = await supabaseAdmin
    .from('games')
    .select('id, name')
    .eq('id', gameId)
    .maybeSingle()

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  if (!data) return null
  return data as GameSummary
}

export const formatProfileName = (profile: ProfileName | null) => {
  const named = profile?.name?.trim()
  if (named) return named
  const composed = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
  if (composed) return composed
  return 'Someone'
}

const fetchProfileName = async (supabaseAdmin: SupabaseClient<Database>, profileId: string) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('name, first_name, last_name')
    .eq('id', profileId)
    .maybeSingle()

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return formatProfileName(data ?? null)
}

const fetchQueueProfileIds = async (
  supabaseAdmin: SupabaseClient<Database>,
  gameId: string,
  statuses: Database['public']['Enums']['game_queue_status'][]
) => {
  if (!statuses.length) return []
  const { data, error } = await supabaseAdmin
    .from('game_queue')
    .select('profile_id')
    .eq('game_id', gameId)
    .in('status', statuses)

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return Array.from(new Set((data ?? []).map((row) => row.profile_id)))
}

const fetchConfirmedProfileIds = async (supabaseAdmin: SupabaseClient<Database>, gameId: string) => {
  return fetchQueueProfileIds(supabaseAdmin, gameId, ['confirmed'])
}

const fetchActiveTokens = async (supabaseAdmin: SupabaseClient<Database>, userIds: string[]) => {
  if (!userIds.length) return []
  const { data, error } = await supabaseAdmin
    .from('user_devices')
    .select('expo_push_token')
    .in('user_id', userIds)
    .is('disabled_at', null)

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return Array.from(new Set((data ?? []).map((row) => row.expo_push_token)))
}

const fetchAllActiveTokens = async (supabaseAdmin: SupabaseClient<Database>) => {
  const { data, error } = await supabaseAdmin
    .from('user_devices')
    .select('expo_push_token')
    .is('disabled_at', null)

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  return Array.from(new Set((data ?? []).map((row) => row.expo_push_token)))
}

const sendPushToUserIds = async (
  supabaseAdmin: SupabaseClient<Database>,
  userIds: string[],
  payload: PushPayload
) => {
  const tokens = await fetchActiveTokens(supabaseAdmin, userIds)
  if (!tokens.length) return { sent: 0, disabledTokens: [] as string[] }
  const messages = buildPushMessages(tokens, payload)
  return deliverPushMessages({ messages, supabaseAdmin })
}

const sendPushToAll = async (supabaseAdmin: SupabaseClient<Database>, payload: PushPayload) => {
  const tokens = await fetchAllActiveTokens(supabaseAdmin)
  if (!tokens.length) return { sent: 0, disabledTokens: [] as string[] }
  const messages = buildPushMessages(tokens, payload)
  return deliverPushMessages({ messages, supabaseAdmin })
}

const toGameUrl = (gameId: string) => `/games/${gameId}`
const toDraftUrl = (gameId: string) => `/games/${gameId}/draft`

export const buildGameCancelledPayload = (game: GameSummary): PushPayload => ({
  title: `Game cancelled: ${game.name}`,
  body: 'This game has been cancelled.',
  data: { url: toGameUrl(game.id) },
})

export const notifyWaitlistPromoted = async ({
  supabaseAdmin,
  gameId,
  profileId,
}: NotifyOptions & { profileId: string }) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  await sendPushToUserIds(supabaseAdmin, [profileId], {
    title: `You are in for ${game.name}`,
    body: 'A spot opened. View the game details.',
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyGameCreatedGlobal = async ({ supabaseAdmin, gameId }: NotifyOptions) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  await sendPushToAll(supabaseAdmin, {
    title: `New game posted: ${game.name}`,
    body: 'Claim a spot now.',
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyGameCancelled = async ({ supabaseAdmin, gameId }: NotifyOptions) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  const roster = await fetchQueueProfileIds(supabaseAdmin, gameId, ['confirmed', 'waitlisted'])
  if (!roster.length) return
  await sendPushToUserIds(supabaseAdmin, roster, buildGameCancelledPayload(game))
}

export const notifyRosterJoinedGlobal = async ({
  supabaseAdmin,
  gameId,
  profileId,
}: NotifyOptions & { profileId: string }) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  const playerName = await fetchProfileName(supabaseAdmin, profileId)
  await sendPushToAll(supabaseAdmin, {
    title: `Roster update: ${game.name}`,
    body: `${playerName} has joined the game.`,
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyRosterLocked = async ({ supabaseAdmin, gameId }: NotifyOptions) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  const roster = await fetchConfirmedProfileIds(supabaseAdmin, gameId)
  if (!roster.length) return
  await sendPushToUserIds(supabaseAdmin, roster, {
    title: `Roster locked for ${game.name}`,
    body: 'Teams are set. Check the lineup.',
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyDraftStarted = async ({ supabaseAdmin, gameId }: NotifyOptions) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  const roster = await fetchConfirmedProfileIds(supabaseAdmin, gameId)
  if (!roster.length) return
  await sendPushToUserIds(supabaseAdmin, roster, {
    title: `Draft is live for ${game.name}`,
    body: 'Join the room to follow the picks.',
    data: { url: toDraftUrl(gameId) },
  })
}

export const notifyDraftReady = async ({ supabaseAdmin, gameId }: NotifyOptions) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  const roster = await fetchConfirmedProfileIds(supabaseAdmin, gameId)
  if (!roster.length) return
  await sendPushToUserIds(supabaseAdmin, roster, {
    title: `Captains set for ${game.name}`,
    body: 'Draft starting now.',
    data: { url: toDraftUrl(gameId) },
  })
}

const buildPickBody = (pickOrder: number | null) => {
  if (!pickOrder) return 'Meet your squad in the draft room.'
  return `Pick #${pickOrder}. Meet your squad.`
}

export const notifyDraftPick = async ({
  supabaseAdmin,
  gameId,
  profileId,
  pickOrder,
}: NotifyOptions & { profileId: string; pickOrder: number | null }) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  await sendPushToUserIds(supabaseAdmin, [profileId], {
    title: `You were drafted in ${game.name}`,
    body: buildPickBody(pickOrder),
    data: { url: toDraftUrl(gameId) },
  })
}

export const notifyDraftCompleted = async ({ supabaseAdmin, gameId }: NotifyOptions) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  const roster = await fetchConfirmedProfileIds(supabaseAdmin, gameId)
  if (!roster.length) return
  await sendPushToUserIds(supabaseAdmin, roster, {
    title: `Draft complete for ${game.name}`,
    body: 'Teams are set. View the roster.',
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyDraftReset = async ({ supabaseAdmin, gameId }: NotifyOptions) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  const roster = await fetchConfirmedProfileIds(supabaseAdmin, gameId)
  if (!roster.length) return
  await sendPushToUserIds(supabaseAdmin, roster, {
    title: `Draft reset for ${game.name}`,
    body: 'Roster changed. We will re-run the draft once everyone confirms.',
    data: { url: toGameUrl(gameId) },
  })
}
