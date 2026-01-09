import { ChevronLeft } from '@tamagui/lucide-icons'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { GameReviewsScreen } from 'app/features/games/reviews-screen'

import { FloatingHeaderLayout } from '../../../components/FloatingHeaderLayout'

const layout = getScreenLayout('gameReviews')

export default function Screen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()

  if (!id) return null

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <FloatingHeaderLayout
          title={layout.title}
          leftIcon={ChevronLeft}
          onPressLeft={() => router.back()}
        >
          {({ scrollProps, HeaderSpacer, topInset }) => (
            <GameReviewsScreen
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
