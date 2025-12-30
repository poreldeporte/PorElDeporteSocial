import { TermsOfServiceScreen } from 'app/features/legal/terms-of-service-screen'
import { getScreenLayout } from '@my/app/navigation/layouts'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const layout = getScreenLayout('legalTerms')

export default function Screen() {
  return (
    <>
      <Stack.Screen options={{ headerTitle: layout.title, headerShown: true }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
        <TermsOfServiceScreen />
      </SafeAreaView>
    </>
  )
}
