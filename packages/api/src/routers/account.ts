import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'

const BAN_DURATION = '876000h'
const DELETED_NAME = 'John Doe'

const toIsoNow = () => new Date().toISOString()

const buildDeletedEmail = (userId: string) => `deleted+${userId}@poreldeporte.local`

const buildDeletedPhone = (userId: string) => {
  let hash = 0
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  let digits = ''
  let seed = hash || 1
  while (digits.length < 10) {
    seed = (seed * 1103515245 + 12345) >>> 0
    digits += String(seed % 10)
  }
  return `+1${digits}`
}

const disableDevices = async (userId: string, now: string) => {
  const { error } = await supabaseAdmin
    .from('user_devices')
    .update({ disabled_at: now })
    .eq('user_id', userId)

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }
}

const banUser = async (
  userId: string,
  payload?: { email?: string | null; phone?: string | null; clearMetadata?: boolean }
) => {
  const update: {
    ban_duration: string
    email?: string | null
    phone?: string | null
    app_metadata?: { deleted: true }
    user_metadata?: Record<string, never>
  } = {
    ban_duration: BAN_DURATION,
  }

  if (payload?.email !== undefined) update.email = payload.email
  if (payload?.phone !== undefined) update.phone = payload.phone
  if (payload?.clearMetadata) {
    update.app_metadata = { deleted: true }
    update.user_metadata = {}
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, update)

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }
}

export const accountRouter = createTRPCRouter({
  deactivate: protectedProcedure.mutation(async ({ ctx }) => {
    const now = toIsoNow()

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ deactivated_at: now })
      .eq('id', ctx.user.id)

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    await disableDevices(ctx.user.id, now)
    await banUser(ctx.user.id)

    return { ok: true }
  }),

  delete: protectedProcedure.mutation(async ({ ctx }) => {
    const now = toIsoNow()
    const deletedEmail = buildDeletedEmail(ctx.user.id)
    const deletedPhone = buildDeletedPhone(ctx.user.id)

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: null,
        last_name: null,
        name: DELETED_NAME,
        email: null,
        phone: null,
        address: null,
        nationality: null,
        birth_date: null,
        jersey_number: null,
        position: null,
        avatar_url: null,
        about: null,
        deleted_at: now,
        deactivated_at: now,
      })
      .eq('id', ctx.user.id)

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    await disableDevices(ctx.user.id, now)
    await banUser(ctx.user.id, {
      email: deletedEmail,
      phone: deletedPhone,
      clearMetadata: true,
    })

    return { ok: true }
  }),
})
