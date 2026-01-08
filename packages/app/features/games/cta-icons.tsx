import type { ReactNode } from 'react'

import { Spinner } from '@my/ui/public'
import { ListPlus, Lock, Star, ThumbsDown } from '@tamagui/lucide-icons'

export type GameCtaState = 'claim' | 'join-waitlist' | 'grab-open-spot' | 'drop'

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
  if (ctaState === 'claim' || ctaState === 'join-waitlist' || ctaState === 'grab-open-spot') {
    return <ListPlus size={16} />
  }
  if (ctaState === 'drop') return <ThumbsDown size={16} />
  return undefined
}
