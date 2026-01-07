import type { ScrollViewProps } from 'react-native'
import { type ReactNode } from 'react'

import { Button, Paragraph, Spinner, YStack } from '@my/ui/public'
import { SCREEN_CONTENT_PADDING } from 'app/constants/layout'
import { api } from 'app/utils/api'
import { useUser } from 'app/utils/useUser'
import { useRouter } from 'solito/router'

import { EditGameForm } from './edit-form'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const GameEditScreen = ({
  gameId,
  scrollProps,
  headerSpacer,
  topInset,
}: { gameId: string } & ScrollHeaderProps) => {
  const { role } = useUser()
  const router = useRouter()
  const { data, isLoading, error } = api.games.byId.useQuery(
    { id: gameId },
    { enabled: !!gameId }
  )

  if (role !== 'admin') {
    return (
      <YStack f={1} ai="center" jc="center" px={SCREEN_CONTENT_PADDING.horizontal} pt={topInset ?? 0}>
        <Paragraph theme="alt2">Only admins can edit games.</Paragraph>
      </YStack>
    )
  }

  if (isLoading) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <Spinner />
      </YStack>
    )
  }

  if (error || !data) {
    return (
      <YStack f={1} ai="center" jc="center" px={SCREEN_CONTENT_PADDING.horizontal} gap="$3" pt={topInset ?? 0}>
        <Paragraph theme="alt1">Unable to load this game.</Paragraph>
        <Button onPress={() => router.back()}>Go back</Button>
      </YStack>
    )
  }

  return (
    <YStack f={1}>
      <EditGameForm
        game={data}
        onSuccess={() => router.back()}
        scrollProps={scrollProps}
        headerSpacer={headerSpacer}
      />
    </YStack>
  )
}
