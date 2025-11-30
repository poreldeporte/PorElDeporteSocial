import {
  Button,
  Card,
  Paragraph,
  SizableText,
  Spinner,
  XStack,
  YStack,
  useToastController,
} from '@my/ui'
import { api } from 'app/utils/api'
import { useEffect, useMemo, useState } from 'react'
import { AlertDialog } from 'tamagui'

import type { GameDetail, QueueEntry } from '../types'

type CaptainSelectorProps = {
  gameId: string
  confirmedPlayers: QueueEntry[]
  captains: GameDetail['captains']
}

export const CaptainSelector = ({ gameId, confirmedPlayers, captains }: CaptainSelectorProps) => {
  const initialSlot0 = captains.find((captain) => captain.slot === 1)?.profileId ?? null
  const initialSlot1 = captains.find((captain) => captain.slot === 2)?.profileId ?? null
  const [slot0, setSlot0] = useState<string | null>(initialSlot0)
  const [slot1, setSlot1] = useState<string | null>(initialSlot1)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    setSlot0(initialSlot0)
    setSlot1(initialSlot1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSlot0, initialSlot1])

  const toast = useToastController()
  const utils = api.useUtils()
  const mutation = api.games.assignCaptains.useMutation({
    onSuccess: async () => {
      setConfirmOpen(false)
      toast.show('Draft started')
      await Promise.all([
        utils.games.byId.invalidate({ id: gameId }),
        utils.teams.state.invalidate({ gameId }),
      ])
    },
    onError: (error) => toast.show('Unable to start draft', { message: error.message }),
  })

  const handleSave = () => {
    if (disabled) return
    setConfirmOpen(true)
  }

  const handleConfirmStart = () => {
    if (!slot0 || !slot1) return
    mutation.mutate({
      gameId,
      captains: [
        { profileId: slot0 },
        { profileId: slot1 },
      ],
    })
  }

  const rows = useMemo(
    () =>
      confirmedPlayers.map((player) => ({
        id: player.player.id,
        name: player.player.name ?? 'Member',
      })),
    [confirmedPlayers]
  )

  const disabled = !slot0 || !slot1 || slot0 === slot1 || mutation.isPending

  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} p="$4" gap="$3">
      <SizableText size="$4" fontWeight="600">
        Assign captains
      </SizableText>
      <Paragraph theme="alt2">
        Choose two confirmed players to lead the draft. Once confirmed, the draft starts immediately.
      </Paragraph>
      <YStack gap="$2">
        {rows.map((player) => (
          <XStack key={player.id} ai="center" jc="space-between">
            <Paragraph>{player.name}</Paragraph>
            <XStack gap="$2">
              <Button
                size="$2"
                theme={slot0 === player.id ? 'active' : undefined}
                onPress={() => setSlot0(player.id)}
              >
                Captain A
              </Button>
              <Button
                size="$2"
                theme={slot1 === player.id ? 'active' : undefined}
                onPress={() => setSlot1(player.id)}
              >
                Captain B
              </Button>
            </XStack>
          </XStack>
        ))}
      </YStack>
      <Button disabled={disabled} onPress={handleSave}>
        Start draft with captains
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            animation="medium"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            o={0.5}
            backgroundColor="$color5"
          />
          <AlertDialog.Content
            elevate
            animation="medium"
            enterStyle={{ opacity: 0, scale: 0.95 }}
            exitStyle={{ opacity: 0, scale: 0.95 }}
            backgroundColor="$color2"
            br="$4"
            p="$4"
            gap="$3"
          >
            <AlertDialog.Title fontWeight="700">Start draft?</AlertDialog.Title>
            <AlertDialog.Description>
              Confirming these captains will remove them from the pool and kick off the draft immediately.
              All remaining picks must be made by the captains.
            </AlertDialog.Description>
            <XStack gap="$3">
              <AlertDialog.Cancel asChild>
                <Button theme="alt1" flex={1} onPress={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  flex={1}
                  onPress={handleConfirmStart}
                  disabled={mutation.isPending}
                  iconAfter={mutation.isPending ? <Spinner size="small" /> : undefined}
                >
                  {mutation.isPending ? 'Starting…' : 'Start draft'}
                </Button>
              </AlertDialog.Action>
            </XStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </Card>
  )
}
