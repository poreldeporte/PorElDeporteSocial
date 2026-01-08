import { ChevronLeft, Star } from '@tamagui/lucide-icons'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { GameDetailScreen } from 'app/features/games/detail-screen'
import { useUser } from 'app/utils/useUser'

import { FloatingHeaderLayout } from '../../components/FloatingHeaderLayout'

const layout = getScreenLayout('gameDetail')

export default function Screen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()
  const { role } = useUser()
  const isAdmin = role === 'admin'

  if (!id) {
    return null
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <FloatingHeaderLayout
          title={layout.title}
          leftIcon={ChevronLeft}
          onPressLeft={() => router.back()}
          rightIcon={isAdmin ? Star : undefined}
          onPressRight={isAdmin ? () => router.push(`/games/${id}/reviews`) : undefined}
        >
          {({ scrollProps, HeaderSpacer, topInset }) => (
            <GameDetailScreen
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
