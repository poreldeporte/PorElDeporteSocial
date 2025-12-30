import { PendingReviewScreen } from 'app/features/auth/pending-review-screen'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          title: 'Review in progress',
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
        <PendingReviewScreen />
      </SafeAreaView>
    </>
  )
}
