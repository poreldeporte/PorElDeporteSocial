import { OnboardingScreen } from 'app/features/auth/onboarding-screen'
import { getScreenLayout } from '@my/app/navigation/layouts'
import { useHeaderHeight } from '@react-navigation/elements'
import { Stack } from 'expo-router'
import { View } from 'react-native'

const layout = getScreenLayout('authOnboarding')

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
        <OnboardingScreen />
      </View>
    </>
  )
}
