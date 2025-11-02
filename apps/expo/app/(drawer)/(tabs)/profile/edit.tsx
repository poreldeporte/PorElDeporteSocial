import { EditProfileScreen } from '@my/app/features/profile/edit-screen'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          title: 'Edit Profile',
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
        <EditProfileScreen />
      </SafeAreaView>
    </>
  )
}
