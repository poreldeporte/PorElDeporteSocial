import { ProfileOnboardingScreen } from 'app/features/profile/profile-onboarding-screen'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          title: 'Finish setup',
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
        <ProfileOnboardingScreen />
      </SafeAreaView>
    </>
  )
}
