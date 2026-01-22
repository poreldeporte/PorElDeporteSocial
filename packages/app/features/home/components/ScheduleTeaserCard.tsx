import { AnimatePresence, Button, Card, Paragraph, XStack, YStack } from '@my/ui/public'
import { ArrowRight } from '@tamagui/lucide-icons'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'solito/router'

import { SectionHeading } from 'app/components/SectionHeading'

type Props = {
  gameId?: string
  variant?: 'schedule' | 'draft'
  title: string
  description: string
  badgeContent?: ReactNode
  meta?: Array<string | ReactNode>
  ctaLabel?: string
  onCtaPress?: () => void
  ctaDisabled?: boolean
  liveIndicator?: boolean
  showArrow?: boolean
}

export const ScheduleTeaserCard = ({
  gameId,
  variant = 'schedule',
  title,
  description,
  badgeContent,
  meta,
  ctaLabel,
  onCtaPress,
  ctaDisabled,
  liveIndicator,
  showArrow,
}: Props) => {
  const router = useRouter()
  const href =
    variant === 'draft'
      ? gameId
        ? `/games/${gameId}/draft`
        : '/games'
      : gameId
        ? `/games/${gameId}`
        : '/games'
  const handlePress = () => router.push(href)
  const handleCta = (event?: any) => {
    event?.stopPropagation?.()
    if (onCtaPress) {
      onCtaPress()
      return
    }
    handlePress()
  }
  const showArrowFinal = showArrow ?? !ctaLabel
  const showBorder = variant === 'draft'
  const metaLine =
    meta
      ?.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .join(' • ') ?? ''
  return (
    <AnimatePresence>
      <Card
        key={`${variant}-${title}`}
        p="$4"
        bordered
        bw={showBorder ? 1 : 0}
        boc={showBorder ? '$color12' : undefined}
        br="$5"
        gap="$4"
        hoverStyle={{ backgroundColor: '$color2' }}
        pressStyle={{ backgroundColor: '$color3' }}
        onPress={handlePress}
        animation="slow"
        enterStyle={{ opacity: 0, y: 20 }}
      >
        <YStack gap="$1.5">
          <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
            <XStack ai="center" gap="$1.5">
              {liveIndicator ? <BlinkDot /> : null}
              <SectionHeading>{title}</SectionHeading>
            </XStack>
            {badgeContent || showArrowFinal ? (
              <XStack ai="center" gap="$2">
                {badgeContent}
                {showArrowFinal ? <ArrowRight size={20} /> : null}
              </XStack>
            ) : null}
          </XStack>
          {description ? (
            <Paragraph theme="alt2" size="$2">
              {description}
            </Paragraph>
          ) : null}
          {metaLine ? (
            <Paragraph theme="alt2" size="$2">
              {metaLine}
            </Paragraph>
          ) : null}
          {ctaLabel ? (
            <XStack ai="center">
              <Button size="$3" br="$10" onPress={handleCta} disabled={ctaDisabled}>
                {ctaLabel}
              </Button>
            </XStack>
          ) : null}
        </YStack>
      </Card>
    </AnimatePresence>
  )
}

const BlinkDot = () => {
  const [blinkOn, setBlinkOn] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkOn((prev) => !prev)
    }, 600)
    return () => clearInterval(interval)
  }, [])

  return (
    <XStack
      w={6}
      h={6}
      br="$10"
      bg="$red9"
      opacity={blinkOn ? 1 : 0.25}
      animation="100ms"
    />
  )
}
