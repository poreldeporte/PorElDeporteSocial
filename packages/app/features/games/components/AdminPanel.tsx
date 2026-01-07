import { Button, Card, Paragraph, SizableText, useToastController, XStack, YStack } from '@my/ui/public'
import { api } from 'app/utils/api'
import { useLink } from 'solito/link'

import type { GameDetail } from '../types'

export const AdminPanel = ({ game }: { game: GameDetail }) => {
  const toast = useToastController()
  const utils = api.useContext()
  const editLink = useLink({ href: `/games/${game.id}/edit` })
  const resultLink = useLink({ href: `/games/${game.id}/result` })
  const cancelMutation = api.games.cancel.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.games.list.invalidate(), utils.games.byId.invalidate({ id: game.id })])
      toast.show('Game cancelled')
    },
    onError: (err) => toast.show('Unable to cancel game', { message: err.message }),
  })

  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} p="$4" gap="$3">
      <SizableText size="$4" fontWeight="600">
        Admin tools
      </SizableText>
      {game.result ? (
        <Paragraph theme="alt2">
          {game.result.status !== 'confirmed' ? 'Pending results.' : 'Result recorded.'}
        </Paragraph>
      ) : (
        <Paragraph theme="alt2">Log winners, edit details, or cancel the run.</Paragraph>
      )}
      <XStack gap="$2" flexWrap="wrap">
        <Button size="$2" {...editLink}>
          Edit details
        </Button>
        <Button size="$2" {...resultLink}>
          {game.result ? (game.result.status !== 'confirmed' ? 'Confirm result' : 'Update result') : 'Report result'}
        </Button>
        <Button
          size="$2"
          variant="outlined"
          theme="red"
          disabled={cancelMutation.isPending || game.status === 'cancelled'}
          onPress={() => cancelMutation.mutate({ id: game.id })}
        >
          {cancelMutation.isPending ? 'Cancelling…' : game.status === 'cancelled' ? 'Cancelled' : 'Cancel game'}
        </Button>
      </XStack>
    </Card>
  )
}
