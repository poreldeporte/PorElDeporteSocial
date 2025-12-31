import { useEffect } from 'react'
import { Platform } from 'react-native'
import { useRouter } from 'solito/router'

import { useSupabase } from 'app/utils/supabase/useSupabase'
const signedOutRoute = Platform.OS === 'web' ? '/sign-in' : '/onboarding'

const useRedirectAfterSignOut = () => {
  const supabase = useSupabase()
  const router = useRouter()
  useEffect(() => {
    const signOutListener = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace(signedOutRoute)
      }
    })
    return () => {
      signOutListener.data.subscription.unsubscribe()
    }
  }, [supabase, router])
}

export const AuthStateChangeHandler = () => {
  useRedirectAfterSignOut()
  return null
}
