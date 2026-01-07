import { ChevronLeft } from '@tamagui/lucide-icons'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { GeneralSettingsScreen } from 'app/features/settings/general-screen'

import { FloatingHeaderLayout } from '../../components/FloatingHeaderLayout'

const layout = getScreenLayout('settingsGeneral')

export default function Screen() {
  const router = useRouter()
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <FloatingHeaderLayout
        title={layout.title}
        leftIcon={ChevronLeft}
        onPressLeft={() => router.back()}
      >
        {({ scrollProps, HeaderSpacer, topInset }) => (
          <GeneralSettingsScreen
            scrollProps={scrollProps}
            headerSpacer={HeaderSpacer}
            topInset={topInset}
          />
        )}
      </FloatingHeaderLayout>
    </SafeAreaView>
  )
}
