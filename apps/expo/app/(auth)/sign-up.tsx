import { SignUpScreen } from 'app/features/auth/sign-up-screen'
import { getScreenLayout } from '@my/app/navigation/layouts'
import { useHeaderHeight } from '@react-navigation/elements'
import { Stack } from 'expo-router'
import { View } from 'react-native'

const layout = getScreenLayout('authSignUp')

export default function Screen() {
  const headerHeight = useHeaderHeight()
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: layout.title,
          headerTintColor: '#fff',
          headerShadowVisible: false,
          headerTransparent: true,
        }}
      />
      <View style={{ flex: 1, paddingTop: headerHeight }}>
        <SignUpScreen />
      </View>
    </>
  )
}
