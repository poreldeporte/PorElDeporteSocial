import { SettingsScreen } from 'app/features/settings/screen'
import { getScreenLayout } from '@my/app/navigation/layouts'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const layout = getScreenLayout('settings')

export default function Screen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerTitle: layout.title }} />
      <SettingsScreen />
    </SafeAreaView>
  )
}
