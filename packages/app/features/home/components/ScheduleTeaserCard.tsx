import { AnimatePresence, Button, Card, Paragraph, SizableText, XStack, YStack } from '@my/ui/public'
import { ArrowRight } from '@tamagui/lucide-icons'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'solito/router'

import { BRAND_COLORS } from 'app/constants/colors'

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
  return (
    <AnimatePresence>
      <Card
        key={`${variant}-${title}`}
        px="$4"
        py="$4"
        bordered
        $platform-native={{ borderWidth: 0 }}
        gap="$3"
        pressStyle={{ opacity: 0.85 }}
        hoverStyle={{ opacity: 0.95 }}
        onPress={handlePress}
        animation="slow"
        enterStyle={{ opacity: 0, y: 20 }}
      >
        <YStack gap="$2">
          <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
            <SizableText size="$5" fontWeight="600">
              <XStack ai="center" gap="$1.5">
                {liveIndicator ? <BlinkDot /> : null}
                {title}
              </XStack>
            </SizableText>
            {badgeContent}
          </XStack>
          {meta?.length ? (
            <YStack gap="$0.5">
              {meta.filter(Boolean).map((item, index) => (
                <Paragraph key={index}>{item}</Paragraph>
              ))}
            </YStack>
          ) : null}
          <XStack ai="center" jc="space-between" gap="$2">
            {ctaLabel ? (
              <Button size="$3" onPress={handleCta} disabled={ctaDisabled}>
                {ctaLabel}
              </Button>
            ) : (
              <XStack />
            )}
            {showArrowFinal ? <ArrowRight size={20} /> : null}
          </XStack>
        </YStack>
      </Card>
    </AnimatePresence>
  )
}

const BlinkDot = () => (
  <XStack
    w={10}
    h={10}
    br="$10"
    bg={BRAND_COLORS.primary}
    borderWidth={1}
    borderColor="$color6"
    animation="pulse"
    animationDuration="800ms"
  />
)
