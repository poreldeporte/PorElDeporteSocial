import { Button } from '@my/ui'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useState } from 'react'
import * as Linking from 'expo-linking'

import { getOAuthRedirectUrl } from 'app/utils/auth/getOAuthRedirectUrl'

import { IconGoogle } from './IconGoogle'

export function GoogleSignIn() {
  const supabase = useSupabase()
  const [isLoading, setIsLoading] = useState(false)

  async function signInWithGoogle() {
    try {
      setIsLoading(true)
      const redirectTo = getOAuthRedirectUrl()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })
      if (error) {
        throw error
      }
      if (data?.url) {
        await Linking.openURL(data.url)
      }
    } catch (error) {
      console.error('Google sign-in failed', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onPress={() => signInWithGoogle()}
      disabled={isLoading}
      icon={IconGoogle}
      // styles to make it look like the native Apple button on AppleSignIn.native.tsx
      scaleIcon={0.75}
      space="$1.5"
      bg="transparent"
      pressStyle={{ bg: 'transparent', o: 0.6, bw: '$0' }}
      animation="200ms"
      chromeless
    >
      {isLoading ? 'Opening…' : 'Sign in with Google'}
    </Button>
  )
}
