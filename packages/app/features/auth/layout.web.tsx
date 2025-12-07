import { XStack, YStack } from '@my/ui/public'

import { OnboardingScreen } from './onboarding-screen'

export type AuthLayoutProps = {
  children?: React.ReactNode
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <XStack f={1}>
      <YStack f={2} fb={0} jc="center">
        <YStack px="$4">{children}</YStack>
      </YStack>

      <YStack $md={{ dsp: 'none' }} f={3} fb={0}>
        <OnboardingScreen />
      </YStack>
    </XStack>
  )
}
