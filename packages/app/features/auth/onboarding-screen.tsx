import { AnimatePresence, Button, H2, Spinner, YStack } from '@my/ui/public'
import { maxGringoLanding } from 'app/assets'
import { BRAND_COLORS } from 'app/constants/colors'
import { SCREEN_CONTENT_PADDING } from 'app/constants/layout'
import { usePathname } from 'app/utils/usePathname'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { useEffect, useState } from 'react'
import { ImageBackground } from 'react-native'
import { useRouter } from 'solito/router'

/**
 * note: this screen is used as a standalone page on native and as a sidebar on auth layout on web
 */
export const OnboardingScreen = () => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)
  const paddingTop = insets.top + SCREEN_CONTENT_PADDING.top
  const paddingBottom = insets.bottom + SCREEN_CONTENT_PADDING.bottom
  const sidePadding = SCREEN_CONTENT_PADDING.horizontal
  const buttonHeight = 54
  useEffect(() => {
    void import('app/features/auth/sign-in-screen')
  }, [])
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  const handleGetStarted = () => {
    if (pathname === '/sign-in') return
    if (isNavigating) return
    setIsNavigating(true)
    router.push('/sign-in')
  }
  const textShadow = {
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  }
  return (
    <YStack f={1} bg="$color1" overflow="hidden">
      <ImageBackground source={maxGringoLanding} resizeMode="cover" style={{ flex: 1 }}>
        <YStack f={1} position="relative">
          <AnimatePresence>
            {isNavigating ? (
              <YStack
                key="auth-transition"
                animation="slow"
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
                position="absolute"
                top={0}
                right={0}
                bottom={0}
                left={0}
                backgroundColor="rgba(0,0,0,0.12)"
                pointerEvents="none"
              />
            ) : null}
          </AnimatePresence>
          <YStack position="absolute" top={paddingTop} right={sidePadding} ai="flex-end">
            <H2
              fontSize={56}
              lineHeight={64}
              fontWeight="800"
              color="#fff"
              letterSpacing={2}
              ta="right"
              style={textShadow}
            >
              INVITE
            </H2>
            <H2
              fontSize={56}
              lineHeight={64}
              fontWeight="800"
              color="#fff"
              letterSpacing={2}
              ta="right"
              style={textShadow}
            >
              ONLY.
            </H2>
          </YStack>
          <YStack
            position="absolute"
            left={sidePadding}
            bottom={paddingBottom + buttonHeight + 16}
          >
            <H2
              fontSize={56}
              lineHeight={64}
              fontWeight="800"
              color="#fff"
              letterSpacing={2}
              style={textShadow}
            >
              POR EL
            </H2>
            <H2
              fontSize={56}
              lineHeight={64}
              fontWeight="800"
              color="#fff"
              letterSpacing={2}
              style={textShadow}
            >
              DEPORTE.
            </H2>
          </YStack>
          <YStack
            position="absolute"
            left={0}
            right={0}
            bottom={paddingBottom}
            ai="center"
            style={{ paddingHorizontal: sidePadding }}
          >
            <Button
              backgroundColor="#fff"
              borderColor="#fff"
              borderWidth={1}
              color="#000"
              fontSize={17}
              fontWeight="600"
              height={buttonHeight}
              borderRadius={999}
              w="100%"
              disabled={isNavigating}
              iconAfter={isNavigating ? <Spinner size="small" color="#000" /> : undefined}
              disabledStyle={{ backgroundColor: '#fff', borderColor: '#fff', opacity: 0.95 }}
              onPress={handleGetStarted}
              pressStyle={{ opacity: 0.85 }}
            >
              {isNavigating ? 'Opening…' : 'Get started'}
            </Button>
          </YStack>
        </YStack>
      </ImageBackground>
    </YStack>
  )
}
