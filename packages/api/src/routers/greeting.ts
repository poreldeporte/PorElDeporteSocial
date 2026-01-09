import { TRPCError } from '@trpc/server'

import { createTRPCRouter, protectedProcedure } from '../trpc'
import { formatProfileName } from '../utils/profileName'

function getTimeOfDay() {
  const today = new Date()
  const curHr = today.getHours()
  if (curHr < 4) {
    return 'night'
  }
  if (curHr < 12) {
    return 'morning'
  }
  if (curHr < 18) {
    return 'afternoon'
  }
  return 'night'
}

export const greetingRouter = createTRPCRouter({
  greet: protectedProcedure.query(async ({ ctx: { supabase, user } }) => {
    const profile = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profile.error) {
      console.error(profile.error)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
    }
    const name = formatProfileName(profile.data, null)
    return `Good ${getTimeOfDay()}${name ? `, ${name}!` : '!'}`
  }),
})
