import { useSupabase } from 'app/utils/supabase/useSupabase'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform } from 'react-native'
import { useState } from 'react'
import * as Linking from 'expo-linking'

import { getOAuthRedirectUrl } from 'app/utils/auth/getOAuthRedirectUrl'

export function AppleSignIn() {
  const supabase = useSupabase()
  const [isLoading, setIsLoading] = useState(false)
  async function signInWithApple() {
    try {
      setIsLoading(true)
      const redirectTo = getOAuthRedirectUrl()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
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
    } catch (e) {
      console.error('Apple sign-in failed', e)
    } finally {
      setIsLoading(false)
    }
  }

  if (Platform.OS !== 'ios') {
    // no Apple sign-in for non-iOS native devices
    return null
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={5}
      style={{ width: '100%', height: 44 }}
      disabled={isLoading}
      onPress={signInWithApple}
    />
  )
}
