import { useCallback } from 'react'
import { Platform } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'

import { api } from 'app/utils/api'
import { loadPushToken, clearPushToken } from 'app/utils/notifications/pushToken'
import { useSessionContext } from 'app/utils/supabase/useSessionContext'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useAppRouter } from 'app/utils/useAppRouter'

export type LogoutOptions = {
  userId?: string | null
}

export type LogoutParams = {
  userId?: string | null
  signOut: () => Promise<void>
  clearCaches: () => void
  loadPushToken?: (userId: string) => Promise<string | null>
  unregisterPushToken?: (token: string) => Promise<void>
  clearPushToken?: (userId: string) => Promise<void>
}

export const runLogout = async ({
  userId,
  signOut,
  clearCaches,
  loadPushToken,
  unregisterPushToken,
  clearPushToken,
}: LogoutParams) => {
  if (userId && loadPushToken) {
    let token: string | null = null
    try {
      token = await loadPushToken(userId)
    } catch {
      token = null
    }

    if (token && unregisterPushToken) {
      try {
        await unregisterPushToken(token)
      } catch {}
    }

    if (clearPushToken) {
      try {
        await clearPushToken(userId)
      } catch {}
    }
  }

  try {
    await signOut()
  } catch {} finally {
    clearCaches()
  }
}

export const useLogout = () => {
  const supabase = useSupabase()
  const { session } = useSessionContext()
  const queryClient = useQueryClient()
  const router = useAppRouter()
  const { mutateAsync: unregisterDevice } = api.notifications.unregisterDevice.useMutation()
  const redirectPath = Platform.OS === 'web' ? '/sign-in' : '/onboarding'

  return useCallback(
    (options?: LogoutOptions) => {
      const userId = options?.userId ?? session?.user?.id ?? null
      return runLogout({
        userId,
        signOut: async () => {
          const { error } = await supabase.auth.signOut()
          if (error) {
            await supabase.auth.signOut({ scope: 'local' })
          }
        },
        clearCaches: () => queryClient.clear(),
        loadPushToken,
        unregisterPushToken: (token) => unregisterDevice({ expoPushToken: token }),
        clearPushToken,
      }).finally(() => {
        router.replace(redirectPath)
      })
    },
    [supabase, queryClient, router, redirectPath, session?.user?.id, unregisterDevice]
  )
}
