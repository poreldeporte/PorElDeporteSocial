import { GameDetailScreen } from 'app/features/games/detail-screen'
import { getScreenLayout } from '@my/app/navigation/layouts'
import { Stack, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const layout = getScreenLayout('gameDetail')

export default function Screen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  if (!id) {
    return null
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: layout.title,
          headerTitleAlign: 'center',
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <GameDetailScreen gameId={id} />
      </SafeAreaView>
    </>
  )
}
