import { IconProps } from '@tamagui/helpers-icon'
import { LinearGradient } from '@tamagui/linear-gradient'
import { ChevronRight } from '@tamagui/lucide-icons'
import React from 'react'
import { useLink } from 'solito/link'
import { Button, Card, CardProps, H4, Progress, SizableText, XStack, YStack } from 'tamagui'

export type AchievementCardProps = {
  icon: React.FC<IconProps>
  title?: string
  progress: {
    current: number
    full: number
    label?: string
  }
  action?: {
    props: ReturnType<typeof useLink>
    text: string
  }
} & CardProps

export const AchievementCard = ({
  title,
  icon: Icon,
  progress,
  action,
  ...props
}: AchievementCardProps) => {
  return (
    <Card br="$0" chromeless {...props}>
      <Card.Header my="auto" padded gap="$3">
        <Icon size="$3" o={0.6} />
        <YStack gap="$2">
          <H4 size="$5" tt="capitalize" mt="$2">
            {title}
          </H4>

          <XStack ai="center">
            <SizableText size="$4" theme="alt1">
              {progress.current}
            </SizableText>
            <SizableText size="$2" theme="alt1">
              {' '}
              / {progress.full} {progress.label}
            </SizableText>
          </XStack>

          <Progress mt="$2" theme="alt2" value={20} bg="$color2" boc="$color5" bw={1}>
            <Progress.Indicator bc="$color7" animation="bouncy" w="100%" />
          </Progress>

          {!!action && (
            <Button mt="$3" als="flex-end" size="$2" iconAfter={<ChevronRight />}>
              {action.text}
            </Button>
          )}
        </YStack>
      </Card.Header>
      <Card.Background>
        <LinearGradient
          br="$6"
          w="100%"
          h="100%"
          colors={['$color2', '$color3', '$color2']}
          start={[1, 1]}
          end={[0.85, 0]}
        />
      </Card.Background>
    </Card>
  )
}
