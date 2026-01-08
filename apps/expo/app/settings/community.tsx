import { ChevronLeft } from '@tamagui/lucide-icons'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { CommunitySettingsScreen } from '@my/app/features/settings/community-screen'

import { FloatingHeaderLayout } from '../../components/FloatingHeaderLayout'

const layout = getScreenLayout('settingsCommunity')

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
          <CommunitySettingsScreen
            scrollProps={scrollProps}
            headerSpacer={HeaderSpacer}
            topInset={topInset}
          />
        )}
      </FloatingHeaderLayout>
    </SafeAreaView>
  )
}
