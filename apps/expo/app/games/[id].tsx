import { ChevronLeft, PenSquare, Star } from '@tamagui/lucide-icons'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { useUser } from '@my/app/utils/useUser'
import { GameDetailScreen } from 'app/features/games/detail-screen'

import { FloatingHeaderLayout } from '../../components/FloatingHeaderLayout'

const layout = getScreenLayout('gameDetail')

export default function Screen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()
  const { isAdmin } = useUser()

  if (!id) {
    return null
  }
  const rightActions =
    isAdmin
      ? [
          { icon: PenSquare, onPress: () => router.push(`/games/${id}/edit`) },
          { icon: Star, onPress: () => router.push(`/games/${id}/reviews`) },
        ]
      : undefined

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <FloatingHeaderLayout
          title={layout.title}
          leftIcon={ChevronLeft}
          onPressLeft={() => router.back()}
          rightActions={rightActions}
          rightVariant="dark"
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
