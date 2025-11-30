import type { GameDetailViewState } from '../useGameDetailState'

export type GameActionBarProps = {
  view: GameDetailViewState
  userStateMessage: string
  onCta: () => void
  onConfirmAttendance: () => void
  isConfirming: boolean
}
