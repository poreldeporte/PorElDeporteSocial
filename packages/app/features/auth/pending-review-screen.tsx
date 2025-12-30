import { Button, H2, Paragraph, YStack } from '@my/ui/public'
import { pedLogo } from 'app/assets'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { SolitoImage } from 'solito/image'
import { useRouter } from 'solito/router'

export const PendingReviewScreen = () => {
  const router = useRouter()
  const supabase = useSupabase()
  const insets = useSafeAreaInsets()
  const contentPaddingTop = Math.max(insets.top, 24) + 24

  return (
    <YStack f={1} bg="$color1" px="$6" pb="$6" jc="space-between" style={{ paddingTop: contentPaddingTop }}>
      <YStack gap="$4" ai="center">
        <SolitoImage src={pedLogo} alt="Por El Deporte crest" width={72} height={72} />
        <YStack gap="$2" maw={320}>
          <H2 ta="center" fontWeight="700">
            Review in progress
          </H2>
          <Paragraph fontSize={16} textAlign="center" color="$color">
            We review every new member once. We will confirm access after a quick check.
          </Paragraph>
        </YStack>
      </YStack>
      <YStack gap="$2">
        <Button
          height={50}
          borderRadius={12}
          fontSize={16}
          fontWeight="600"
          onPress={() => router.push('/onboarding/profile')}
        >
          Edit profile
        </Button>
        <Button
          height={50}
          borderRadius={12}
          fontSize={16}
          fontWeight="600"
          variant="outlined"
          onPress={() => supabase.auth.signOut()}
        >
          Log out
        </Button>
      </YStack>
    </YStack>
  )
}
