import { Alert } from 'react-native'
import { ChevronLeft, Trash } from '@tamagui/lucide-icons'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { useUser } from '@my/app/utils/useUser'
import { useToastController } from '@my/ui/public'
import { GameEditScreen } from 'app/features/games/edit-screen'
import { api } from 'app/utils/api'

import { FloatingHeaderLayout } from '../../../components/FloatingHeaderLayout'

const layout = getScreenLayout('gameEdit')

export default function Screen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()
  const { isAdmin } = useUser()
  const toast = useToastController()
  const utils = api.useUtils()
  const deleteMutation = api.games.delete.useMutation({
    onSuccess: async () => {
      await utils.games.list.invalidate()
      toast.show('Game deleted')
      router.replace('/games')
    },
    onError: (error) => {
      toast.show('Unable to delete game', { message: error.message })
    },
  })
  const handleDelete = () => {
    if (!id || deleteMutation.isPending) return
    Alert.alert(
      'Delete game?',
      'This removes the game and all related data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate({ id }) },
      ]
    )
  }
  const rightActions =
    isAdmin
      ? [
          {
            icon: Trash,
            onPress: handleDelete,
            variant: 'dark' as const,
          },
        ]
      : undefined

  if (!id) return null

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <FloatingHeaderLayout
          title={layout.title}
          leftIcon={ChevronLeft}
          onPressLeft={() => router.back()}
          rightActions={rightActions}
        >
          {({ scrollProps, HeaderSpacer, topInset }) => (
            <GameEditScreen
              gameId={id}
              scrollProps={scrollProps}
              headerSpacer={HeaderSpacer}
              topInset={topInset}
            />
          )}
        </FloatingHeaderLayout>
      </SafeAreaView>
    </>
  )
}
