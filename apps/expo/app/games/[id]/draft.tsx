import { useState } from 'react'

import { ChevronLeft, RotateCcw } from '@tamagui/lucide-icons'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { useUser } from '@my/app/utils/useUser'
import { GameDraftScreen } from 'app/features/games/draft-screen'

import { FloatingHeaderLayout } from '../../../components/FloatingHeaderLayout'

const layout = getScreenLayout('gameDraft')

export default function Screen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()
  const { isAdmin } = useUser()
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const rightActions = isAdmin
    ? [
        {
          icon: RotateCcw,
          label: 'Reset draft (admin only)',
          onPress: () => setResetConfirmOpen(true),
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
            <GameDraftScreen
              gameId={id}
              scrollProps={scrollProps}
              headerSpacer={HeaderSpacer}
              topInset={topInset}
              resetConfirmOpen={resetConfirmOpen}
              onResetConfirmOpenChange={setResetConfirmOpen}
            />
          )}
        </FloatingHeaderLayout>
      </SafeAreaView>
    </>
  )
}
