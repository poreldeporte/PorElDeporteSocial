import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@my/supabase/types'

export const markGameCompletedIfNeeded = async (
  supabase: SupabaseClient<Database>,
  gameId: string,
  shouldComplete: boolean
) => {
  if (!shouldComplete) return

  const { error } = await supabase
    .from('games')
    .update({ status: 'completed' })
    .eq('id', gameId)
    .neq('status', 'completed')

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }
}
