import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@my/supabase/types'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const MAX_CHUNK_SIZE = 100

export type PushPayload = {
  title: string
  body: string
  data?: Record<string, unknown>
}

export type PushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
}

type ExpoPushTicket = {
  status: 'ok' | 'error'
  details?: {
    error?: string
  }
}

type ExpoPushResponse = {
  data?: ExpoPushTicket[]
}

export const buildPushMessages = (tokens: string[], payload: PushPayload): PushMessage[] =>
  tokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data,
  }))

export const chunkMessages = <T>(items: T[], size = MAX_CHUNK_SIZE) => {
  if (!items.length) return []
  if (items.length <= size) return [items]
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

const fetchExpo = async (messages: PushMessage[]) => {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  })

  if (!response.ok) {
    throw new Error(`Expo push request failed: ${response.status}`)
  }

  return (await response.json()) as ExpoPushResponse
}

const collectInvalidTokens = (messages: PushMessage[], response: ExpoPushResponse) => {
  const tickets = response.data ?? []
  return tickets.flatMap((ticket, index) => {
    if (ticket.status !== 'error') return []
    const error = ticket.details?.error
    if (error !== 'DeviceNotRegistered' && error !== 'InvalidPushToken') return []
    const token = messages[index]?.to
    return token ? [token] : []
  })
}

const disableTokens = async (supabaseAdmin: SupabaseClient<Database>, tokens: string[]) => {
  if (!tokens.length) return
  const { error } = await supabaseAdmin
    .from('user_devices')
    .update({ disabled_at: new Date().toISOString() })
    .in('expo_push_token', tokens)

  if (error) {
    throw new Error(error.message)
  }
}

export const deliverPushMessages = async ({
  messages,
  supabaseAdmin,
}: {
  messages: PushMessage[]
  supabaseAdmin: SupabaseClient<Database>
}) => {
  if (!messages.length) return { sent: 0, disabledTokens: [] as string[] }
  const chunks = chunkMessages(messages)
  const disabledTokens = new Set<string>()
  let sent = 0
  for (const chunk of chunks) {
    const response = await fetchExpo(chunk)
    const tickets = response.data ?? []
    sent += tickets.filter((ticket) => ticket.status === 'ok').length
    collectInvalidTokens(chunk, response).forEach((token) => disabledTokens.add(token))
  }
  const disabled = Array.from(disabledTokens)
  if (disabled.length) await disableTokens(supabaseAdmin, disabled)
  return { sent, disabledTokens: disabled }
}
