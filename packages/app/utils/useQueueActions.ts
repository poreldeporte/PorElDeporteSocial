import { useState } from 'react'
import { Alert, Platform } from 'react-native'

import { useToastController } from '@my/ui/public'

import { api } from './api'

const useGameInvalidator = () => {
  const utils = api.useContext()
  return async (gameId: string) => {
    await Promise.all([
      utils.games.byId.invalidate({ id: gameId }),
      utils.games.list.invalidate(),
    ])
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
      notify.show(result.status === 'confirmed' ? 'You joined the game' : 'Added to waitlist')
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
      notify.show('You left the game')
    },
    onError: (error) => notify.show('Unable to update queue', { message: error.message }),
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

const confirmDrop = (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return Promise.resolve(window.confirm('Drop out? You could lose your spot.'))
    }
    return Promise.resolve(true)
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert('Drop out?', 'Your spot will immediately go to the waitlist.', [
      {
        text: 'Keep spot',
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: 'Drop out',
        style: 'destructive',
        onPress: () => resolve(true),
      },
    ])
  })
}

export const useQueueActions = () => {
  const toast = useToastController()
  const invalidate = useGameInvalidator()
  const [pendingGameId, setPendingGameId] = useState<string | null>(null)
  const handleSettled = () => setPendingGameId(null)

  const joinMutation = useJoinQueueMutation(invalidate, handleSettled, toast)
  const leaveMutation = useLeaveQueueMutation(invalidate, handleSettled, toast)
  const confirmMutation = useConfirmAttendanceMutation(invalidate, toast)

  const join = (gameId: string) => {
    setPendingGameId(gameId)
    joinMutation.mutate({ gameId })
  }

  const leave = async (gameId: string) => {
    const confirmed = await confirmDrop()
    if (!confirmed) return
    setPendingGameId(gameId)
    leaveMutation.mutate({ gameId })
  }

  return {
    join,
    leave,
    confirmAttendance: (gameId: string) => confirmMutation.mutate({ gameId }),
    pendingGameId,
    isPending: joinMutation.isPending || leaveMutation.isPending,
    isConfirming: confirmMutation.isPending,
  }
}

export default useQueueActions
