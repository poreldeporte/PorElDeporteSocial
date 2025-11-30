"use client"

import { Button } from '@my/ui'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useRouter } from 'solito/router'
import { getOAuthRedirectUrl } from 'app/utils/auth/getOAuthRedirectUrl'

import { IconGoogle } from './IconGoogle'

type GoogleSignInProps = {
  label?: string
  variant?: 'default' | 'compact'
  onSelect?: () => void
}

export function GoogleSignIn({
  label = 'Continue with Google',
  variant = 'default',
  onSelect,
}: GoogleSignInProps) {
  const router = useRouter()
  const supabase = useSupabase()
  const handleOAuthSignIn = async () => {
    const redirectTo = getOAuthRedirectUrl()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    })
    if (error) {
      console.error('Google sign-in failed', error.message)
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
    <Button br="$10" size={variant === 'compact' ? '$3' : '$4'} onPress={handlePress} icon={IconGoogle}>
      {label}
    </Button>
  )
}
