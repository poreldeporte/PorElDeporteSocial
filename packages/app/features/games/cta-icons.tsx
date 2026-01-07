import type { ReactNode } from 'react'

import { Spinner } from '@my/ui/public'
import { ListPlus, Lock, Star, ThumbsDown } from '@tamagui/lucide-icons'

export type GameCtaState = 'join' | 'leave-confirmed' | 'leave-waitlisted'

type CtaIconInput = {
  isPending?: boolean
  showConfirm?: boolean
  isRate?: boolean
  ctaState?: GameCtaState
}

export const getGameCtaIcon = ({
  isPending,
  showConfirm,
  isRate,
  ctaState,
}: CtaIconInput): ReactNode | undefined => {
  if (isPending) return <Spinner size="small" />
  if (showConfirm) return <Lock size={16} />
  if (isRate) return <Star size={16} />
  if (ctaState === 'join') return <ListPlus size={16} />
  if (ctaState === 'leave-confirmed' || ctaState === 'leave-waitlisted') {
    return <ThumbsDown size={16} />
  }
  return undefined
}
