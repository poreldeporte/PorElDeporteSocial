import { SignInScreen } from 'app/features/auth/sign-in-screen'
import { getScreenLayout } from '@my/app/navigation/layouts'
import { useTheme } from '@my/ui/public'
import { useHeaderHeight } from '@react-navigation/elements'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const layout = getScreenLayout('authSignIn')

export default function Screen() {
  const headerHeight = useHeaderHeight()
  const { color1 } = useTheme()
  const backgroundColor = color1?.val ?? '#fff'
  return (
    <SafeAreaView
      style={{ flex: 1, paddingTop: headerHeight, backgroundColor }}
      edges={['bottom', 'left', 'right']}
    >
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
