import type { GameDetail } from './types'

export type DraftVisibility = 'public' | 'admin_only'

export const resolveDraftVisibility = (
  value: GameDetail['draftVisibility'] | null | undefined
): DraftVisibility => (value === 'admin_only' ? 'admin_only' : 'public')

export const isRosterReadyForDraft = (game: GameDetail) => {
  const rosteredEntries = game.queue.filter((entry) => entry.status === 'rostered')
  const rosteredCount = game.rosteredCount ?? rosteredEntries.length
  if (!game.capacity || rosteredCount < game.capacity) return false
  if (!game.confirmationEnabled) return true
  const confirmedCount = rosteredEntries.filter((entry) => entry.attendanceConfirmedAt).length
  return confirmedCount >= rosteredCount
}

export const canPlayerAccessDraftRoom = (game: GameDetail) => {
  if (game.draftModeEnabled === false) return false
  if (game.draftStatus === 'completed') return false
  if (resolveDraftVisibility(game.draftVisibility) !== 'public') return false
  if (game.draftStatus && game.draftStatus !== 'pending') return true
  return isRosterReadyForDraft(game)
}

export const canAdminAccessDraftRoom = (_game: GameDetail) => true
