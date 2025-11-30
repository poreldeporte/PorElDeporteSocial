import { ChangeEmailScreen } from 'app/features/settings/change-email-screen'
import { getScreenLayout } from '@my/app/navigation/layouts'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const layout = getScreenLayout('settingsChangeEmail')

export default function Screen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerTitle: layout.title }} />
      <ChangeEmailScreen />
    </SafeAreaView>
  )
}
