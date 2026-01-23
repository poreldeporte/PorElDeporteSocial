import { useState } from 'react'

import { useToastController } from '@my/ui/public'

import { api } from './api'
import { useActiveCommunity } from './useActiveCommunity'

const LIST_SCOPES: Array<'upcoming' | 'past'> = ['upcoming', 'past']

const useGameInvalidator = (communityId?: string | null) => {
  const utils = api.useContext()
  return async (gameId: string) => {
    const listInvalidations = communityId
      ? LIST_SCOPES.map((scope) =>
          utils.games.list.invalidate({ scope, communityId })
        )
      : []
    await Promise.all([utils.games.byId.invalidate({ id: gameId }), ...listInvalidations])
  }
}

const useJoinQueueMutation = (
  onInvalidate: (gameId: string) => Promise<void>,
  onSettled: () => void,
  notify: ReturnType<typeof useToastController>
) =>
  api.queue.join.useMutation({
    onSuccess: async (result, variables) => {
      await onInvalidate(variables.gameId)
      notify.show(result.status === 'rostered' ? 'Spot claimed' : 'Joined waitlist')
    },
    onError: (error) => notify.show('Unable to join game', { message: error.message }),
    onSettled,
  })

const useLeaveQueueMutation = (
  onInvalidate: (gameId: string) => Promise<void>,
  onSettled: () => void,
  notify: ReturnType<typeof useToastController>
) =>
  api.queue.leave.useMutation({
    onSuccess: async (_result, variables) => {
      await onInvalidate(variables.gameId)
      notify.show('Dropped from game')
    },
    onError: (error) => notify.show('Unable to update queue', { message: error.message }),
    onSettled,
  })

const useGrabOpenSpotMutation = (
  onInvalidate: (gameId: string) => Promise<void>,
  onSettled: () => void,
  notify: ReturnType<typeof useToastController>
) =>
  api.queue.grabOpenSpot.useMutation({
    onSuccess: async (_result, variables) => {
      await onInvalidate(variables.gameId)
      notify.show('Spot grabbed')
    },
    onError: (error) => notify.show('Unable to grab spot', { message: error.message }),
    onSettled,
  })

const useConfirmAttendanceMutation = (
  onInvalidate: (gameId: string) => Promise<void>,
  notify: ReturnType<typeof useToastController>
) =>
  api.queue.confirmAttendance.useMutation({
    onSuccess: async (_result, variables) => {
      await onInvalidate(variables.gameId)
      notify.show('Attendance confirmed')
    },
    onError: (error) => notify.show('Unable to confirm', { message: error.message }),
  })

export const useQueueActions = () => {
  const toast = useToastController()
  const { activeCommunityId } = useActiveCommunity()
  const invalidate = useGameInvalidator(activeCommunityId)
  const [pendingGameId, setPendingGameId] = useState<string | null>(null)
  const handleSettled = () => setPendingGameId(null)

  const joinMutation = useJoinQueueMutation(invalidate, handleSettled, toast)
  const leaveMutation = useLeaveQueueMutation(invalidate, handleSettled, toast)
  const grabMutation = useGrabOpenSpotMutation(invalidate, handleSettled, toast)
  const confirmMutation = useConfirmAttendanceMutation(invalidate, toast)

  const join = (gameId: string) => {
    setPendingGameId(gameId)
    joinMutation.mutate({ gameId })
  }

  const leave = (gameId: string) => {
    setPendingGameId(gameId)
    leaveMutation.mutate({ gameId })
  }

  return {
    join,
    leave,
    grabOpenSpot: (gameId: string) => {
      setPendingGameId(gameId)
      grabMutation.mutate({ gameId })
    },
    confirmAttendance: (gameId: string) => confirmMutation.mutate({ gameId }),
    pendingGameId,
    isPending: joinMutation.isPending || leaveMutation.isPending || grabMutation.isPending,
    isConfirming: confirmMutation.isPending,
  }
}

export default useQueueActions
