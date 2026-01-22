import { Button, H2, Paragraph, YStack, submitButtonBaseProps } from '@my/ui/public'
import { SCREEN_CONTENT_PADDING } from 'app/constants/layout'
import { useBrand } from 'app/provider/brand'
import { useLogout } from 'app/utils/auth/logout'
import { useUser } from 'app/utils/useUser'
import { SolitoImage } from 'solito/image'
import { useRouter } from 'solito/router'

type ScrollHeaderProps = {
  topInset?: number
}

export const PendingReviewScreen = ({ topInset }: ScrollHeaderProps) => {
  const router = useRouter()
  const logout = useLogout()
  const { profile } = useUser()
  const isRejected = profile?.approval_status === 'rejected'
  const { logo } = useBrand()
  const title = isRejected ? 'Application not approved' : 'Review in progress'
  const subtitle = isRejected
    ? 'Update your profile to reapply. We review each application carefully.'
    : 'We review every new member once. We will confirm access after a quick check.'
  const primaryLabel = isRejected ? 'Update application' : 'Edit application'
  const contentPaddingTop = topInset ?? SCREEN_CONTENT_PADDING.top
  const pillButtonProps = {
    height: 54,
    borderRadius: 999,
    fontSize: 17,
    fontWeight: '600',
    w: '100%',
    pressStyle: { opacity: 0.85 },
  } as const

  return (
    <YStack
      f={1}
      bg="$color1"
      px={SCREEN_CONTENT_PADDING.horizontal}
      pb={SCREEN_CONTENT_PADDING.bottom}
      jc="space-between"
      style={{ paddingTop: contentPaddingTop }}
    >
      <YStack gap="$4" ai="center">
        <SolitoImage src={logo} alt="Por El Deporte crest" width={72} height={72} />
        <YStack gap="$2" maw={320}>
          <H2 ta="center" fontWeight="700">
            {title}
          </H2>
          <Paragraph fontSize={16} textAlign="center" color="$color">
            {subtitle}
          </Paragraph>
        </YStack>
      </YStack>
      <YStack gap="$2">
        <Button
          {...submitButtonBaseProps}
          {...pillButtonProps}
          onPress={() => router.push('/onboarding/profile')}
        >
          {primaryLabel}
        </Button>
        <Button
          variant="outlined"
          {...pillButtonProps}
          onPress={() => logout()}
        >
          Log out
        </Button>
      </YStack>
    </YStack>
  )
}
