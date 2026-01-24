import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getScreenLayout } from 'app/navigation/layouts'
import { ProfileOnboardingScreen } from 'app/features/profile/profile-onboarding-screen'

import { FloatingHeaderLayout } from '../../components/FloatingHeaderLayout'

export default function Screen() {
  const layout = getScreenLayout('profileOnboarding')
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <FloatingHeaderLayout
          title={layout.title}
          headerBackground="transparent"
        >
          {({ scrollProps, HeaderSpacer, topInset }) => (
            <ProfileOnboardingScreen
              scrollProps={scrollProps}
              headerSpacer={HeaderSpacer}
              topInset={topInset}
            />
          )}
        </FloatingHeaderLayout>
      </SafeAreaView>
    </>
  )
}
