import { Paragraph, Separator, SizableText, XStack, YStack, isWeb } from '@my/ui'
import { trackAuthEvent } from 'app/utils/analytics'

import { AppleSignIn } from './AppleSignIn'
import { GoogleSignIn } from './GoogleSignIn'

type SocialLoginProps = {
  variant?: 'default' | 'compact'
  stepIndex?: number
  showSeparator?: boolean
}

export function SocialLogin({ variant = 'default', stepIndex, showSeparator }: SocialLoginProps) {
  const compact = variant === 'compact' && !isWeb
  const shouldShowSeparator = showSeparator ?? (!compact && isWeb)
  const handleSelect = (provider: 'apple' | 'google') => () =>
    trackAuthEvent('auth_social_selected', { provider, stepIndex })

  return (
    <YStack gap="$2">
      <Paragraph ta="center" theme="alt1" size="$2">
        {compact
          ? 'Skip passwords—use Apple or Google.'
          : 'Prefer a faster start? Use Apple or Google and we’ll still capture your kit and roster info.'}
      </Paragraph>
      {shouldShowSeparator ? <OrSeparator /> : null}
      {compact ? (
        <XStack gap="$2" mt="$1">
          <AppleSignIn variant="compact" label="Apple" onSelect={handleSelect('apple')} />
          <GoogleSignIn variant="compact" label="Google" onSelect={handleSelect('google')} />
        </XStack>
      ) : (
        <YStack gap="$3">
          <AppleSignIn onSelect={handleSelect('apple')} />
          <GoogleSignIn onSelect={handleSelect('google')} />
        </YStack>
      )}
    </YStack>
  )
}

function OrSeparator() {
  if (!isWeb) {
    return null
  }
  return (
    <YStack>
      <YStack pos="absolute" fullscreen ai="center" jc="center">
        <Separator f={1} w="100%" />
      </YStack>
      <YStack ai="center" jc="center">
        <YStack bc="$color1" px="$3">
          <SizableText theme="alt1" size="$2" tt="uppercase" ta="center">
            Or
          </SizableText>
        </YStack>
      </YStack>
    </YStack>
  )
}
