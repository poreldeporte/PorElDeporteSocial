import type { ComponentProps, ReactNode } from 'react'

import { Button, Card, Paragraph, Theme, XStack, YStack, isWeb } from '@my/ui/public'
import { HelpCircle } from '@tamagui/lucide-icons'

import { SectionHeading } from './SectionHeading'

type SectionCardProps = {
  title: string
  description?: string
  onInfoPress?: () => void
  infoLabel?: string
  rightSlot?: ReactNode
  variant?: 'solid' | 'glass'
  glassBackground?: string
  isDark?: boolean
  headerProps?: Partial<ComponentProps<typeof YStack>>
  bodyProps?: Partial<ComponentProps<typeof YStack>>
  children: ReactNode
}

export const SectionCard = ({
  title,
  description,
  onInfoPress,
  infoLabel,
  rightSlot,
  variant = 'solid',
  glassBackground,
  isDark = false,
  headerProps,
  bodyProps,
  children,
}: SectionCardProps) => {
  const header = (
    <Theme inverse>
      <YStack
        p="$4"
        gap="$1"
        borderBottomWidth={1}
        borderBottomColor="$color12"
        backgroundColor="$color1"
        {...headerProps}
      >
        <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
          <SectionHeading>{title}</SectionHeading>
          {rightSlot ? (
            rightSlot
          ) : onInfoPress ? (
            <Button
              chromeless
              size="$2"
              p="$1"
              onPress={onInfoPress}
              aria-label={infoLabel ?? `${title} info`}
              pressStyle={{ opacity: 0.7 }}
            >
              <Button.Icon>
                <HelpCircle size={20} color="$color12" />
              </Button.Icon>
            </Button>
          ) : null}
        </XStack>
        {description ? (
          <Paragraph color="$color12" size="$2">
            {description}
          </Paragraph>
        ) : null}
      </YStack>
    </Theme>
  )

  const body = (
    <YStack p="$4" gap="$3" backgroundColor="$color1" w="100%" {...bodyProps}>
      {children}
    </YStack>
  )

  if (variant === 'glass') {
    return (
      <YStack
        borderWidth={1}
        borderColor="$color12"
        borderRadius={20}
        p={0}
        bg={glassBackground ?? '$color1'}
        overflow="hidden"
        shadowColor={isDark ? '#00000066' : '#00000022'}
        shadowOpacity={0.18}
        shadowRadius={18}
        elevation={6}
        style={isWeb ? { backdropFilter: 'blur(14px)' } : undefined}
      >
        {header}
        {body}
      </YStack>
    )
  }

  return (
    <Card bordered bw={1} boc="$color12" br="$5" p={0} overflow="hidden" backgroundColor="$color2">
      {header}
      {body}
    </Card>
  )
}
