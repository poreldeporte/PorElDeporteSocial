import { CreateScreen } from 'app/features/create/screen'
import { Stack } from 'expo-router'

export default function Screen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Create' }} />
      <CreateScreen />
    </>
  )
}
