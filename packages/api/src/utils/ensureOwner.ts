import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@my/supabase/types'

export const ensureOwner = async (
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

  if (!(data?.status === 'approved' && data?.role === 'owner')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only the founder can perform this action',
    })
  }
}
