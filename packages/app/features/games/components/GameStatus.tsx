import { Paragraph, SizableText, XStack } from '@my/ui/public'
import { Calendar, ShieldAlert } from '@tamagui/lucide-icons'
import type { ReactNode } from 'react'

import type { CombinedStatus } from '../status-helpers'
import type { GameStatus } from '../types'

export type StatusTone = 'default' | 'success' | 'warning' | 'neutral'

export const StatusBadge = ({
  tone,
  children,
  showIcon = true,
}: {
  tone: StatusTone
  children: ReactNode
  showIcon?: boolean
}) => {
  const palette: Record<StatusTone, { bg: string; border: string; dot: string; text: string }> = {
    default: { bg: '$color1', border: '$color4', dot: '$color8', text: '$color11' },
    success: { bg: '$green1', border: '$green5', dot: '$green9', text: '$green11' },
    warning: { bg: '$yellow1', border: '$yellow5', dot: '$yellow10', text: '$yellow11' },
    neutral: { bg: '$color1', border: '$color4', dot: '$color6', text: '$color11' },
  }
  const styles = palette[tone] ?? palette.default
  return (
    <XStack
      ai="center"
      gap="$1.5"
      px="$2"
      py="$1"
      br="$10"
      bg={styles.bg as any}
      borderWidth={1}
      borderColor={styles.border as any}
    >
      {showIcon ? (
        tone === 'warning' ? (
          <ShieldAlert size={14} color="$yellow10" />
        ) : (
          <XStack w={6} h={6} br="$10" bg={styles.dot as any} />
        )
      ) : null}
      <SizableText size="$2" color={styles.text as any} fontWeight="600">
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

export const StatusNote = ({
  status,
  waitlistFull,
}: {
  status: GameStatus
  waitlistFull: boolean
}) => {
  if (status === 'locked') {
    return waitlistFull ? (
      <Paragraph theme="alt2">Waitlist is full. We’ll alert you if a spot opens.</Paragraph>
    ) : null
  }
  if (status === 'cancelled') {
    return <Paragraph theme="alt2">This game was cancelled.</Paragraph>
  }
  if (status === 'completed') {
    return <Paragraph theme="alt2">This game has already been played.</Paragraph>
  }
  if (waitlistFull) {
    return <Paragraph theme="alt2">Waitlist is full. Spots open when players drop.</Paragraph>
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
