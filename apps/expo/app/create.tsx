import { ChevronLeft } from '@tamagui/lucide-icons'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getScreenLayout } from 'app/navigation/layouts'
import { CreateScreen } from 'app/features/create/screen'

import { FloatingHeaderLayout } from '../components/FloatingHeaderLayout'

const layout = getScreenLayout('createScreen')

export default function Screen() {
  const router = useRouter()
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <FloatingHeaderLayout
          title={layout.title}
          leftIcon={ChevronLeft}
          onPressLeft={() => router.back()}
        >
          {({ scrollProps, HeaderSpacer, topInset }) => (
            <CreateScreen scrollProps={scrollProps} headerSpacer={HeaderSpacer} topInset={topInset} />
          )}
        </FloatingHeaderLayout>
      </SafeAreaView>
    </>
  )
}
