import { Stack } from 'expo-router'
import { getScreenLayout } from '@my/app/navigation/layouts'

export default function Layout() {
  const editLayout = getScreenLayout('profileEdit')
  const profileLayout = getScreenLayout('profile')
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: profileLayout.title,
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          headerTitle: editLayout.title,
          headerBackTitleVisible: false,
        }}
      />
    </Stack>
  )
}
