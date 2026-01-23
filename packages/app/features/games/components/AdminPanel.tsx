import { PenSquare, Star, X } from '@tamagui/lucide-icons'

import { Button, Card, Paragraph, SizableText, useToastController, XStack, YStack } from '@my/ui/public'
import { api } from 'app/utils/api'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useLink } from 'solito/link'

import type { GameDetail } from '../types'

export const AdminPanel = ({ game }: { game: GameDetail }) => {
  const toast = useToastController()
  const utils = api.useContext()
  const { activeCommunityId } = useActiveCommunity()
  const editLink = useLink({ href: `/games/${game.id}/edit` })
  const resultLink = useLink({ href: `/games/${game.id}/result` })
  const draftLink = useLink({ href: `/games/${game.id}/draft` })
  const reviewsLink = useLink({ href: `/games/${game.id}/reviews` })
  const invalidateLists = async () => {
    if (!activeCommunityId) return
    await Promise.all([
      utils.games.list.invalidate({ scope: 'upcoming', communityId: activeCommunityId }),
      utils.games.list.invalidate({ scope: 'past', communityId: activeCommunityId }),
    ])
  }
  const cancelMutation = api.games.cancel.useMutation({
    onSuccess: async () => {
      await Promise.all([invalidateLists(), utils.games.byId.invalidate({ id: game.id })])
      toast.show('Game cancelled')
    },
    onError: (err) => toast.show('Unable to cancel game', { message: err.message }),
  })
  const primaryAction = getPrimaryAction(game)
  const statusLine = getStatusLine(game)
  const iconButtonProps = {
    size: '$2',
    circular: true,
    backgroundColor: '$color2',
    borderWidth: 1,
    borderColor: '$color4',
    pressStyle: { backgroundColor: '$color3' },
    hoverStyle: { backgroundColor: '$color3' },
  } as const

  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} p="$4" gap="$3">
      <YStack gap="$1">
        <SizableText size="$4" fontWeight="600">
          Admin controls
        </SizableText>
        <Paragraph theme="alt2">{statusLine}</Paragraph>
      </YStack>
      {primaryAction ? (
        <Button size="$3" br="$10" {...(primaryAction.kind === 'draft' ? draftLink : resultLink)}>
          {primaryAction.label}
        </Button>
      ) : null}
      <XStack gap="$2">
        <Button
          {...iconButtonProps}
          icon={PenSquare}
          aria-label="Edit game details"
          {...editLink}
        />
        <Button
          {...iconButtonProps}
          icon={Star}
          aria-label="View reviews"
          {...reviewsLink}
        />
        <Button
          {...iconButtonProps}
          icon={X}
          theme="red"
          aria-label="Cancel game"
          disabled={cancelMutation.isPending || game.status === 'cancelled'}
          onPress={() => cancelMutation.mutate({ id: game.id })}
        />
      </XStack>
    </Card>
  )
}

const getPrimaryAction = (game: GameDetail) => {
  if (game.status === 'cancelled') return null
  if (game.draftModeEnabled === false) return null
  if (game.draftModeEnabled !== false && game.status === 'scheduled' && game.draftStatus !== 'completed') {
    if (game.draftStatus === 'pending') return { kind: 'draft' as const, label: 'Select captains' }
    if (game.draftStatus === 'ready') return { kind: 'draft' as const, label: 'Start draft' }
    if (game.draftStatus === 'in_progress') return { kind: 'draft' as const, label: 'Open draft room' }
    return { kind: 'draft' as const, label: 'Review draft' }
  }
  if (!game.result) return { kind: 'result' as const, label: 'Report result' }
  return {
    kind: 'result' as const,
    label: game.result.status !== 'confirmed' ? 'Confirm result' : 'Update result',
  }
}

const getStatusLine = (game: GameDetail) => {
  const draftLabel = game.draftModeEnabled === false ? 'Draft: off' : `Draft: ${formatDraftStatus(game.draftStatus)}`
  const resultLabel = game.result
    ? `Result: ${game.result.status === 'confirmed' ? 'confirmed' : 'pending'}`
    : game.status === 'completed'
      ? 'Result: missing'
      : 'Result: not reported'
  const confirmationLabel = `Confirmations: ${game.confirmationEnabled ? 'on' : 'off'}`
  return [draftLabel, resultLabel, confirmationLabel].join(' · ')
}

const formatDraftStatus = (status: GameDetail['draftStatus'] | null | undefined) => {
  if (!status) return 'captains needed'
  if (status === 'pending') return 'captains needed'
  if (status === 'ready') return 'captains set'
  if (status === 'in_progress') return 'live'
  if (status === 'completed') return 'complete'
  return status.replace('_', ' ')
}
