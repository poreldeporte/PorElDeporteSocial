"use client"

import { Button } from '@my/ui'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useRouter } from 'solito/router'
import { getOAuthRedirectUrl } from 'app/utils/auth/getOAuthRedirectUrl'

import { IconApple } from './IconApple'

type AppleSignInProps = {
  label?: string
  variant?: 'default' | 'compact'
  onSelect?: () => void
}

export function AppleSignIn({ label = 'Continue with Apple', variant = 'default', onSelect }: AppleSignInProps) {
  const router = useRouter()
  const supabase = useSupabase()
  const handleOAuthSignIn = async () => {
    const redirectTo = getOAuthRedirectUrl()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    })
    if (error) {
      console.error('Apple sign-in failed', error.message)
      return
    }
    if (data?.url && typeof window !== 'undefined') {
      window.location.assign(data.url)
      return
    }
    router.replace('/')
  }

  const handlePress = async () => {
    onSelect?.()
    await handleOAuthSignIn()
  }

  return (
    <Button br="$10" size={variant === 'compact' ? '$3' : '$4'} onPress={handlePress} icon={IconApple}>
      {label}
    </Button>
  )
}
