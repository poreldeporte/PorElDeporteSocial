import { CreateScreen } from 'app/features/create/screen'
import { getScreenLayout } from '@my/app/navigation/layouts'
import { Stack } from 'expo-router'

const layout = getScreenLayout('createScreen')

export default function Screen() {
  return (
    <>
      <Stack.Screen options={{ headerTitle: layout.title }} />
      <CreateScreen />
    </>
  )
}
