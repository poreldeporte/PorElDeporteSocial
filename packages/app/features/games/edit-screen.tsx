import { Button, Paragraph, Spinner, YStack } from '@my/ui/public'
import { api } from 'app/utils/api'
import { useUser } from 'app/utils/useUser'
import { useRouter } from 'solito/router'

import { EditGameForm } from './edit-form'

export const GameEditScreen = ({ gameId }: { gameId: string }) => {
  const { role } = useUser()
  const router = useRouter()
  const { data, isLoading, error } = api.games.byId.useQuery(
    { id: gameId },
    { enabled: !!gameId }
  )

  if (role !== 'admin') {
    return (
      <YStack f={1} ai="center" jc="center" px="$4">
        <Paragraph theme="alt2">Only admins can edit games.</Paragraph>
      </YStack>
    )
  }

  if (isLoading) {
    return (
      <YStack f={1} ai="center" jc="center">
        <Spinner />
      </YStack>
    )
  }

  if (error || !data) {
    return (
      <YStack f={1} ai="center" jc="center" px="$4" gap="$3">
        <Paragraph theme="alt1">Unable to load this game.</Paragraph>
        <Button onPress={() => router.back()}>Go back</Button>
      </YStack>
    )
  }

  return (
    <YStack f={1} px="$4" py="$4" gap="$4">
      <Paragraph theme="alt1">Make sure any roster changes are communicated to the players.</Paragraph>
      <EditGameForm game={data} onSuccess={() => router.back()} />
    </YStack>
  )
}
