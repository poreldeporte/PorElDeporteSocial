import { AdminProfileEditScreen } from '@my/app/features/profile/edit-screen'
import { getScreenLayout } from '@my/app/navigation/layouts'
import { Stack, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const layout = getScreenLayout('adminMemberEdit')

export default function Screen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  if (!id) return null

  return (
    <>
      <Stack.Screen options={{ headerTitle: layout.title, headerShown: true }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <AdminProfileEditScreen profileId={id} />
      </SafeAreaView>
    </>
  )
}
