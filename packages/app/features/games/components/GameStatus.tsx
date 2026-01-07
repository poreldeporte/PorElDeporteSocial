import { Paragraph, SizableText, XStack } from '@my/ui/public'
import { Calendar, ShieldAlert } from '@tamagui/lucide-icons'
import { useEffect, useState, type ReactNode } from 'react'

import type { CombinedStatus } from '../status-helpers'
import type { GameStatus } from '../types'

export type StatusTone = 'default' | 'success' | 'warning' | 'neutral'

export const StatusBadge = ({
  tone,
  children,
  showIcon = true,
  dotColor,
  blinkDot = false,
  backgroundColor,
  borderColor,
  textColor,
}: {
  tone: StatusTone
  children: ReactNode
  showIcon?: boolean
  dotColor?: string
  blinkDot?: boolean
  backgroundColor?: string
  borderColor?: string
  textColor?: string
}) => {
  const palette: Record<StatusTone, { bg: string; border: string; dot: string; text: string }> = {
    default: { bg: '$color1', border: '$color4', dot: '$color8', text: '$color11' },
    success: { bg: '$green1', border: '$green5', dot: '$green9', text: '$green11' },
    warning: { bg: '$yellow1', border: '$yellow5', dot: '$yellow10', text: '$yellow11' },
    neutral: { bg: '$color1', border: '$color4', dot: '$color6', text: '$color11' },
  }
  const styles = palette[tone] ?? palette.default
  const resolvedDotColor = dotColor ?? styles.dot
  const resolvedBackground = backgroundColor ?? styles.bg
  const resolvedBorderColor = borderColor ?? styles.border
  const resolvedTextColor = textColor ?? styles.text
  const [blinkOn, setBlinkOn] = useState(true)

  useEffect(() => {
    if (!blinkDot) return
    const interval = setInterval(() => {
      setBlinkOn((prev) => !prev)
    }, 600)
    return () => clearInterval(interval)
  }, [blinkDot])
  return (
    <XStack
      ai="center"
      gap="$1.5"
      px="$2"
      py="$1"
      br="$10"
      bg={resolvedBackground as any}
      borderWidth={1}
      borderColor={resolvedBorderColor as any}
    >
      {showIcon ? (
        tone === 'warning' ? (
          <ShieldAlert size={14} color="$yellow10" />
        ) : (
          <XStack
            w={6}
            h={6}
            br="$10"
            bg={resolvedDotColor as any}
            opacity={blinkDot ? (blinkOn ? 1 : 0.25) : 1}
            animation={blinkDot ? '100ms' : undefined}
          />
        )
      ) : null}
      <SizableText size="$2" color={resolvedTextColor as any} fontWeight="600">
        {children}
      </SizableText>
    </XStack>
  )
}

export const CombinedStatusBadge = ({ status }: { status?: CombinedStatus | null }) => {
  if (!status) return null
  return (
    <XStack>
      <StatusBadge tone={status.tone} showIcon>
        {status.label}
      </StatusBadge>
    </XStack>
  )
}

export const StatusNote = ({ status }: { status: GameStatus }) => {
  if (status === 'cancelled') {
    return <Paragraph theme="alt2">This game was cancelled.</Paragraph>
  }
  if (status === 'completed') {
    return <Paragraph theme="alt2">This game has already been played.</Paragraph>
  }
  return null
}

export const InfoChip = ({
  icon: Icon,
  label,
  tone = 'default',
}: {
  icon: typeof Calendar
  label: string
  tone?: StatusTone
}) => (
  <XStack
    ai="center"
    gap="$2"
    px="$3"
    py="$1.5"
    br="$10"
    bg={(tone === 'warning' ? '$yellow2' : '$color2') as any}
    borderWidth={1}
    borderColor={(tone === 'warning' ? '$yellow6' : '$color3') as any}
  >
    <Icon size={16} color={(tone === 'warning' ? '$yellow10' : '$color11') as any} />
    <SizableText size="$2">{label}</SizableText>
  </XStack>
)
