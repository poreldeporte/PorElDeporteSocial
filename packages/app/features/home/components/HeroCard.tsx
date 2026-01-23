import { AnimatePresence, Card, Paragraph, SizableText, XStack, YStack } from '@my/ui/public'
import { SolitoImage } from 'solito/image'
import { LinearGradient } from '@tamagui/linear-gradient'
import { useEffect, useMemo, useState } from 'react'
import { useUser } from 'app/utils/useUser'
import { Instagram } from '@tamagui/lucide-icons'
import { Link } from 'solito/link'
import { useThemeSetting } from 'app/provider/theme'
import { useBrand } from 'app/provider/brand'
import { useCommunitySwitcher } from 'app/provider/community-switcher'

const GREETING_TEMPLATES: Array<(name: string) => string> = [
  (name) => `Hello ${name}, ready to fuch?`,
  (name) => `${name}, the pitch is calling.`,
  (name) => `Boots laced, ${name}?`,
  (name) => `Hola ${name}, let’s run.`,
  (name) => `Crew’s waiting on you, ${name}.`,
  (name) => `Ready when you are, ${name}.`,
  (name) => `${name}, bring the heat tonight.`,
  (name) => `Lights on, vibes up. Let’s go, ${name}.`,
]

type Particle = {
  key: string
  size: number
  top?: number
  left?: number
  right?: number
  bottom?: number
  drift: number
}

export const HeroCard = () => {
  const { logo } = useBrand()
  const communitySwitcher = useCommunitySwitcher()
  const canOpenSwitcher = Boolean(communitySwitcher)
  const [crestVisible, setCrestVisible] = useState(false)
  const [copyVisible, setCopyVisible] = useState(false)
  const [glowShift, setGlowShift] = useState(0)
  const [particleOffset, setParticleOffset] = useState(0)
  const [greetingIndex, setGreetingIndex] = useState(() =>
    Math.floor(Math.random() * GREETING_TEMPLATES.length)
  )
  const [typedGreeting, setTypedGreeting] = useState('')
  const { resolvedTheme } = useThemeSetting()
  const isDark = resolvedTheme === 'dark'
  const { profile, displayName } = useUser()
  const firstName =
    (profile?.first_name && profile.first_name.trim()) ||
    (displayName ? displayName.split(' ')[0] : '') ||
    'friend'
  const greeting = useMemo(
    () =>
      GREETING_TEMPLATES[greetingIndex % GREETING_TEMPLATES.length]?.(firstName) ??
      GREETING_TEMPLATES[0](firstName),
    [firstName, greetingIndex]
  )

  const particles: Particle[] = [
    { key: 'p1', size: 18, top: 18, left: 36, drift: 12 },
    { key: 'p2', size: 12, top: 32, right: 48, drift: -10 },
    { key: 'p3', size: 16, bottom: 42, left: 52, drift: 8 },
    { key: 'p4', size: 10, bottom: 24, right: 36, drift: -12 },
  ]

  useEffect(() => {
    setCrestVisible(true)
    const copyTimer = setTimeout(() => setCopyVisible(true), 180)
    const glowTimer = setInterval(() => setGlowShift((prev) => (prev + 1) % 360), 16000)
    const particleTimer = setInterval(() => setParticleOffset((prev) => (prev + 1) % 1000), 20000)
    return () => {
      clearTimeout(copyTimer)
      clearInterval(glowTimer)
      clearInterval(particleTimer)
    }
  }, [])

  useEffect(() => {
    setGreetingIndex(Math.floor(Math.random() * GREETING_TEMPLATES.length))
  }, [firstName])

  useEffect(() => {
    setTypedGreeting('')
    let index = 0
    const typingInterval = setInterval(() => {
      index += 1
      setTypedGreeting(greeting.slice(0, index))
      if (index >= greeting.length) {
        clearInterval(typingInterval)
      }
    }, 35)
    return () => {
      clearInterval(typingInterval)
    }
  }, [greeting])

  return (
    <YStack
      br={32}
      p="$0.5"
      animation="verySlow"
      scale={1}
      {...(canOpenSwitcher
        ? {
            onPress: () => communitySwitcher?.open(),
            cursor: 'pointer',
            pressStyle: { opacity: 0.95 },
            accessibilityRole: 'button',
            accessibilityLabel: 'Switch community',
          }
        : {})}
    >
      <LinearGradient
        colors={
          isDark
            ? ['rgba(255,120,48,0.45)', 'rgba(3,7,12,0.6)']
            : ['rgba(255,120,48,0.28)', 'rgba(255,255,255,0.9)']
        }
        start={[0.5 + 0.5 * Math.sin(glowShift * 0.017), 0]}
        end={[1, 1]}
        borderRadius={32}
        padding={2}
      >
        <Card
          px="$4"
          py="$4"
          borderWidth={0}
          bg={isDark ? 'rgba(5,8,13,0.85)' : '$color1'}
          shadowColor="#ff6b3d55"
          shadowRadius={35}
          br="$9"
        >
          <YStack ai="center" gap="$3" position="relative">
            <AnimatePresence>
              {crestVisible && (
                <YStack
                  key="ped-crest"
                  animation="slow"
                  enterStyle={{ opacity: 0, scale: 0.92, y: 20 }}
                  exitStyle={{ opacity: 0, scale: 1.05, y: -12 }}
                >
                  <SolitoImage
                    src={logo}
                    alt="Por El Deporte crest"
                    width={240}
                    height={240}
                    style={{ borderRadius: 48 }}
                  />
                </YStack>
              )}
            </AnimatePresence>
            <YStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              pointerEvents="none"
            >
              {particles.map((particle) => (
                <YStack
                  key={particle.key}
                  position="absolute"
                  width={particle.size}
                  height={particle.size}
                  br="$10"
                  backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                  y={Math.sin((particleOffset + particle.drift * 5) * 0.005) * particle.drift}
                  animation="slow"
                  enterStyle={{ opacity: 0 }}
                  {...(particle.top !== undefined ? { top: particle.top } : {})}
                  {...(particle.bottom !== undefined ? { bottom: particle.bottom } : {})}
                  {...(particle.left !== undefined ? { left: particle.left } : {})}
                  {...(particle.right !== undefined ? { right: particle.right } : {})}
                />
              ))}
            </YStack>
            {copyVisible ? (
              <YStack ai="center" pt="$3">
                <SizableText size="$6" fontWeight="700" textAlign="center">
                  {typedGreeting}
                </SizableText>
                <Link href="https://instagram.com/poreldeporte" target="_blank" rel="noreferrer">
                  <XStack
                    mt="$3"
                    px="$3"
                    py="$1.5"
                    br="$10"
                    bg={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
                    borderWidth={1}
                    borderColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)'}
                    ai="center"
                    gap="$2"
                  >
                    <Instagram size={16} />
                    <Paragraph theme="alt2" size="$2">
                      Follow @poreldeporte for highlights
                    </Paragraph>
                  </XStack>
                </Link>
              </YStack>
            ) : null}
          </YStack>
        </Card>
      </LinearGradient>
    </YStack>
  )
}
