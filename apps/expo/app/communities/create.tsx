import { ChevronLeft } from '@tamagui/lucide-icons'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CreateCommunityScreen } from 'app/features/community/create-screen'

import { FloatingHeaderLayout } from '../../components/FloatingHeaderLayout'

export default function Screen() {
  const router = useRouter()
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <FloatingHeaderLayout
          title="Create community"
          headerBackground="transparent"
          leftIcon={ChevronLeft}
          onPressLeft={() => router.back()}
        >
          {({ scrollProps, HeaderSpacer, topInset }) => (
            <CreateCommunityScreen
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
