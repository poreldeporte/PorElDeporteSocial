import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, publicProcedure } from '../trpc'

const getEmailExists = async (email: string) => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Supabase env vars missing.' })
  }

  const endpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(
    email
  )}`
  const response = await fetch(endpoint, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`,
    },
  })

  if (!response.ok) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unable to check email availability.' })
  }

  const payload = (await response.json()) as { users?: { email?: string | null }[] }
  const exists = payload?.users?.some((user) => user.email?.toLowerCase() === email.toLowerCase())
  return Boolean(exists)
}

export const authRouter = createTRPCRouter({
  checkEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const exists = await getEmailExists(input.email)
      return { exists }
    }),
})
