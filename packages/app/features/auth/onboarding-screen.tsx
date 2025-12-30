import { Button, H2, Paragraph, YStack } from '@my/ui/public'
import { LinearGradient } from '@tamagui/linear-gradient'
import { pedLogo, welcomeHero } from 'app/assets'
import { BRAND_COLORS } from 'app/constants/colors'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { SolitoImage } from 'solito/image'
import { useRouter } from 'solito/router'

const PRIMARY_COLOR = BRAND_COLORS.primary

/**
 * note: this screen is used as a standalone page on native and as a sidebar on auth layout on web
 */
export const OnboardingScreen = () => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const paddingTop = Math.max(insets.top, 0)
  const paddingBottom = Math.max(insets.bottom, 24) + 24
  return (
    <YStack
      f={1}
      px="$7"
      bg="$color1"
      position="relative"
      overflow="hidden"
      style={{ paddingTop, paddingBottom }}
    >
      <SolitoImage
        src={welcomeHero}
        alt="Por El Deporte community"
        fill
        resizeMode="cover"
      />
      <LinearGradient
        fullscreen
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
        start={[0, 0]}
        end={[0, 1]}
        zIndex={1}
        pointerEvents="none"
      />
      <YStack f={1} jc="space-between" ai="center" zIndex={2}>
        <YStack ai="center" gap="$3" style={{ marginTop: -12 }}>
          <SolitoImage src={pedLogo} alt="Por El Deporte crest" width={120} height={120} />
          <YStack gap="$2" maw={320}>
            <Paragraph fontSize={12} letterSpacing={1} textTransform="uppercase" color="#fff" textAlign="center">
              Invite-only since 2014
            </Paragraph>
            <H2 ta="center" fontWeight="700" color="#fff">
              Members Only
            </H2>
            <Paragraph fontSize={15} color="#fff" textAlign="center">
              A friends-of-friends Miami futbol community built on respect on and off the field.
            </Paragraph>
          </YStack>
        </YStack>
        <Button
          backgroundColor="#fff"
          borderColor="#fff"
          borderWidth={1}
          color="#000"
          fontSize={17}
          fontWeight="600"
          height={50}
          borderRadius={12}
          w="100%"
          onPress={() => router.push('/sign-in')}
          pressStyle={{ opacity: 0.85 }}
        >
          Member Access
        </Button>
      </YStack>
    </YStack>
  )
}
