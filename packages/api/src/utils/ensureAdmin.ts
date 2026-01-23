import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@my/supabase/types'

export const ensureAdmin = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  communityId: string
) => {
  const { data, error } = await supabase
    .from('memberships')
    .select('role, status')
    .eq('profile_id', userId)
    .eq('community_id', communityId)
    .maybeSingle()

  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    })
  }

  const isAdmin =
    data?.status === 'approved' && (data?.role === 'admin' || data?.role === 'owner')
  if (!isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only admins can perform this action',
    })
  }
}
