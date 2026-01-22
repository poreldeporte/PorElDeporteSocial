import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@my/supabase/types'

import { formatProfileName as formatProfileNameBase } from '../utils/profileName'
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

export const formatProfileName = (profile: ProfileName | null) =>
  formatProfileNameBase(profile, 'Someone')

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
  return Array.from(
    new Set((data ?? []).map((row) => row.profile_id).filter((id): id is string => Boolean(id)))
  )
}

const fetchRosteredProfileIds = async (supabaseAdmin: SupabaseClient<Database>, gameId: string) => {
  return fetchQueueProfileIds(supabaseAdmin, gameId, ['rostered'])
}

const fetchWaitlistedProfileIds = async (supabaseAdmin: SupabaseClient<Database>, gameId: string) => {
  return fetchQueueProfileIds(supabaseAdmin, gameId, ['waitlisted'])
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

const toGameUrl = (gameId: string) => `/games/${gameId}`

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

export const notifyWaitlistDemoted = async ({
  supabaseAdmin,
  gameId,
  profileId,
}: NotifyOptions & { profileId: string }) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  await sendPushToUserIds(supabaseAdmin, [profileId], {
    title: `Roster update: ${game.name}`,
    body: 'A roster change moved you to the waitlist.',
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyGameCancelled = async ({ supabaseAdmin, gameId }: NotifyOptions) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  const roster = await fetchQueueProfileIds(supabaseAdmin, gameId, ['rostered', 'waitlisted'])
  if (!roster.length) return
  await sendPushToUserIds(supabaseAdmin, roster, buildGameCancelledPayload(game))
}

export const notifyResultsConfirmed = async ({ supabaseAdmin, gameId }: NotifyOptions) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  const roster = await fetchRosteredProfileIds(supabaseAdmin, gameId)
  if (!roster.length) return
  await sendPushToUserIds(supabaseAdmin, roster, {
    title: `Results posted: ${game.name}`,
    body: 'Ratings and stats are live. Rate your game.',
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyCrunchTimeStarted = async ({
  supabaseAdmin,
  gameId,
  profileIds,
}: NotifyOptions & { profileIds?: string[] }) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  const waitlist = profileIds ?? (await fetchWaitlistedProfileIds(supabaseAdmin, gameId))
  if (!waitlist.length) return
  await sendPushToUserIds(supabaseAdmin, waitlist, {
    title: `Crunch time: ${game.name}`,
    body: 'Last-minute opening — grab open spot.',
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyConfirmationReminder = async ({
  supabaseAdmin,
  gameId,
  profileIds,
}: NotifyOptions & { profileIds: string[] }) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  if (!profileIds.length) return
  await sendPushToUserIds(supabaseAdmin, profileIds, {
    title: `Confirm attendance: ${game.name}`,
    body: 'Confirm your spot to keep it.',
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyGameNotification = async ({
  supabaseAdmin,
  gameId,
  profileIds,
}: NotifyOptions & { profileIds: string[] }) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  if (!profileIds.length) return
  await sendPushToUserIds(supabaseAdmin, profileIds, {
    title: `Game reminder: ${game.name}`,
    body: 'Check the game details.',
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyCaptainsAssigned = async ({
  supabaseAdmin,
  gameId,
  profileIds,
}: NotifyOptions & { profileIds: string[] }) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  const uniqueIds = Array.from(new Set(profileIds))
  if (!uniqueIds.length) return
  await sendPushToUserIds(supabaseAdmin, uniqueIds, {
    title: `You're a captain for ${game.name}`,
    body: 'Draft starts now.',
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyCaptainTurn = async ({
  supabaseAdmin,
  gameId,
  profileId,
}: NotifyOptions & { profileId: string }) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  await sendPushToUserIds(supabaseAdmin, [profileId], {
    title: `Your pick: ${game.name}`,
    body: "It's your turn to pick.",
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyPlayerDrafted = async ({
  supabaseAdmin,
  gameId,
  profileId,
}: NotifyOptions & { profileId: string }) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return
  await sendPushToUserIds(supabaseAdmin, [profileId], {
    title: `You were drafted for ${game.name}`,
    body: 'Check your team details.',
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyGuestNeedsConfirmation = async ({
  supabaseAdmin,
  gameId,
  guestQueueId,
}: NotifyOptions & { guestQueueId: string }) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return

  const { data: guestRow, error } = await supabaseAdmin
    .from('game_queue')
    .select('added_by_profile_id, guest_name, attendance_confirmed_at')
    .eq('id', guestQueueId)
    .maybeSingle()

  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  if (!guestRow?.added_by_profile_id || guestRow.attendance_confirmed_at) return

  const guestLabel = guestRow.guest_name?.trim() || 'your guest'
  await sendPushToUserIds(supabaseAdmin, [guestRow.added_by_profile_id], {
    title: `Confirm ${guestLabel} for ${game.name}`,
    body: 'A guest spot opened. Confirm attendance in the roster.',
    data: { url: toGameUrl(gameId) },
  })
}

export const notifyTardyMarked = async ({
  supabaseAdmin,
  gameId,
  profileId,
  guestName,
}: NotifyOptions & { profileId: string; guestName?: string | null }) => {
  const game = await fetchGameSummary(supabaseAdmin, gameId)
  if (!game) return

  const guestLabel = guestName?.trim()
  const title = guestLabel ? `Tardy noted for ${guestLabel}` : `Tardy noted: ${game.name}`
  const body = guestLabel
    ? `Your guest was marked tardy for ${game.name}.`
    : 'You were marked tardy for this game.'

  await sendPushToUserIds(supabaseAdmin, [profileId], {
    title,
    body,
    data: { url: toGameUrl(gameId) },
  })
}
