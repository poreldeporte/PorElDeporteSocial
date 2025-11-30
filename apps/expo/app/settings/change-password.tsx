import { ChangePasswordScreen } from 'app/features/settings/change-password-screen'
import { getScreenLayout } from '@my/app/navigation/layouts'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const layout = getScreenLayout('settingsChangePassword')

export default function Screen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerTitle: layout.title }} />
      <ChangePasswordScreen />
    </SafeAreaView>
  )
}
