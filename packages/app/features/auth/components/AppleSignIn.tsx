import { Button } from '@my/ui'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useRouter } from 'solito/router'

import { IconApple } from './IconApple'

export function AppleSignIn() {
  const router = useRouter()
  const supabase = useSupabase()
  const handleOAuthSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        // your options
      },
    })
    if (error) {
      // handle error
      return
    }
    router.replace('/')
  }

  return (
    <Button br="$10" onPress={() => handleOAuthSignIn()} icon={IconApple}>
      Sign in with Apple
    </Button>
  )
}
