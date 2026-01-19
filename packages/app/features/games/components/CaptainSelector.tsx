import {
  Button,
  Card,
  ConfirmDialog,
  Paragraph,
  SizableText,
  XStack,
  YStack,
  useToastController,
} from '@my/ui/public'
import { api } from 'app/utils/api'
import { useEffect, useMemo, useState } from 'react'

import type { GameDetail, QueueEntry } from '../types'

type CaptainSelectorProps = {
  gameId: string
  rosteredPlayers: QueueEntry[]
  captains: GameDetail['captains']
}

export const CaptainSelector = ({ gameId, rosteredPlayers, captains }: CaptainSelectorProps) => {
  const rosteredCount = rosteredPlayers.length
  const availableCaptainCounts = useMemo(() => {
    const counts: number[] = []
    for (let i = 2; i <= rosteredCount; i += 1) {
      if (rosteredCount % i === 0) counts.push(i)
    }
    return counts
  }, [rosteredCount])
  const initialCaptainCount =
    captains.length >= 2 && rosteredCount % captains.length === 0
      ? captains.length
      : availableCaptainCounts[0] ?? 2
  const [captainCount, setCaptainCount] = useState(initialCaptainCount)
  const [slots, setSlots] = useState<Array<string | null>>(() => {
    const next = Array.from({ length: initialCaptainCount }, () => null)
    captains.forEach((captain) => {
      if (captain.slot && captain.slot <= next.length) {
        next[captain.slot - 1] = captain.profileId
      }
    })
    return next
  })
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    setCaptainCount(initialCaptainCount)
    setSlots(() => {
      const next = Array.from({ length: initialCaptainCount }, () => null)
      captains.forEach((captain) => {
        if (captain.slot && captain.slot <= next.length) {
          next[captain.slot - 1] = captain.profileId
        }
      })
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCaptainCount, captains])

  const toast = useToastController()
  const utils = api.useUtils()
  const mutation = api.games.assignCaptains.useMutation({
    onSuccess: async () => {
      setConfirmOpen(false)
      toast.show('Captains set')
      await Promise.all([
        utils.games.byId.invalidate({ id: gameId }),
        utils.teams.state.invalidate({ gameId }),
      ])
    },
    onError: (error) => toast.show('Unable to set captains', { message: error.message }),
  })
  const clearCaptainsMutation = api.games.clearCaptains.useMutation({
    onSuccess: async () => {
      toast.show('Captains cleared')
      await Promise.all([
        utils.games.byId.invalidate({ id: gameId }),
        utils.teams.state.invalidate({ gameId }),
      ])
    },
    onError: (error) => toast.show('Unable to clear captains', { message: error.message }),
  })

  const handleSave = () => {
    if (disabled) return
    setConfirmOpen(true)
  }

  const handleConfirmStart = () => {
    if (!slots.every(Boolean)) return
    mutation.mutate({
      gameId,
      captains: slots.filter(Boolean).map((profileId) => ({ profileId: profileId as string })),
    })
  }

  const rows = useMemo(
    () =>
      rosteredPlayers
        .filter((player) => Boolean(player.profileId))
        .map((player) => ({
          id: player.profileId as string,
          name: player.player.name ?? 'Member',
        })),
    [rosteredPlayers]
  )
  const nameById = useMemo(() => new Map(rows.map((row) => [row.id, row.name])), [rows])
  const selectedIds = slots.filter(Boolean) as string[]
  const uniqueSelected = new Set(selectedIds).size === selectedIds.length
  const disabled = !slots.every(Boolean) || !uniqueSelected || mutation.isPending
  const teamSize = captainCount > 0 ? Math.floor(rosteredCount / captainCount) : 0

  const handleCaptainCountChange = (count: number) => {
    setCaptainCount(count)
    setSlots((prev) => {
      const next = Array.from({ length: count }, () => null)
      prev.slice(0, count).forEach((profileId, index) => {
        next[index] = profileId
      })
      return next
    })
  }

  const toggleCaptain = (profileId: string) => {
    setSlots((prev) => {
      const existingIndex = prev.findIndex((id) => id === profileId)
      if (existingIndex !== -1) {
        const next = [...prev]
        next[existingIndex] = null
        return next
      }
      const emptyIndex = prev.findIndex((id) => !id)
      if (emptyIndex === -1) {
        toast.show('All captain slots are filled')
        return prev
      }
      const next = [...prev]
      next[emptyIndex] = profileId
      return next
    })
  }

  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} p="$4" gap="$3">
      <SizableText size="$4" fontWeight="600">
        Assign captains
      </SizableText>
      <Paragraph theme="alt2">
        Choose rostered players to lead the draft. After confirming, pick a draft mode to begin.
      </Paragraph>
      {availableCaptainCounts.length ? (
        <XStack gap="$2" flexWrap="wrap">
          {availableCaptainCounts.map((count) => (
            <Button
              key={count}
              size="$2"
              theme={count === captainCount ? 'active' : undefined}
              onPress={() => handleCaptainCountChange(count)}
            >
              {`${count} captains`}
            </Button>
          ))}
        </XStack>
      ) : null}
      {teamSize ? (
        <Paragraph theme="alt2" size="$2">
          Teams of {teamSize}
        </Paragraph>
      ) : null}
      <YStack gap="$2">
        {slots.map((profileId, index) => (
          <XStack key={index} ai="center" jc="space-between">
            <Paragraph theme="alt2">Captain {index + 1}</Paragraph>
            <XStack ai="center" gap="$2">
              <Paragraph fontWeight="600">
                {profileId ? nameById.get(profileId) ?? 'Member' : 'Tap a player to assign'}
              </Paragraph>
              {profileId ? (
                <Button size="$2" variant="outlined" onPress={() => toggleCaptain(profileId)}>
                  Remove
                </Button>
              ) : null}
            </XStack>
          </XStack>
        ))}
      </YStack>
      <YStack gap="$2">
        {rows.map((player, index) => (
          <XStack key={`${player.id || 'player'}-${index}`} ai="center" jc="space-between">
            <Paragraph>{player.name}</Paragraph>
            <Button
              size="$2"
              theme={selectedIds.includes(player.id) ? 'active' : undefined}
              onPress={() => toggleCaptain(player.id)}
            >
              {selectedIds.includes(player.id)
                ? `Captain ${slots.findIndex((id) => id === player.id) + 1}`
                : 'Assign'}
            </Button>
          </XStack>
        ))}
      </YStack>
      <XStack gap="$2" flexWrap="wrap">
        <Button disabled={disabled} onPress={handleSave}>
          Start draft with captains
        </Button>
        {captains.length ? (
          <Button
            variant="outlined"
            onPress={() => clearCaptainsMutation.mutate({ gameId })}
            disabled={clearCaptainsMutation.isPending}
          >
            {clearCaptainsMutation.isPending ? 'Clearing…' : 'Clear captains'}
          </Button>
        ) : null}
      </XStack>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Start draft?"
        description="Confirming these captains will remove them from the pool and kick off the draft immediately. All remaining picks must be made by the captains."
        confirmLabel="Start draft"
        confirmPending={mutation.isPending}
        onConfirm={handleConfirmStart}
      />
    </Card>
  )
}
