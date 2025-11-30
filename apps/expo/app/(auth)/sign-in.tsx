import { SignInScreen } from 'app/features/auth/sign-in-screen'
import { getScreenLayout } from '@my/app/navigation/layouts'
import { useHeaderHeight } from '@react-navigation/elements'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const layout = getScreenLayout('authSignIn')

export default function Screen() {
  const headerHeight = useHeaderHeight()
  return (
    <SafeAreaView style={{ flex: 1, paddingTop: headerHeight }} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerTitle: layout.title,
          headerTintColor: '#fff',
          headerShadowVisible: false,
          headerTransparent: true,
        }}
      />
      <SignInScreen />
    </SafeAreaView>
  )
}
