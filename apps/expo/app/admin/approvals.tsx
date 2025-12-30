import { MemberApprovalsScreen } from '@my/app/features/admin/member-approvals-screen'
import { getScreenLayout } from '@my/app/navigation/layouts'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const layout = getScreenLayout('adminApprovals')

export default function Screen() {
  return (
    <>
      <Stack.Screen options={{ headerTitle: layout.title, headerShown: true }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <MemberApprovalsScreen />
      </SafeAreaView>
    </>
  )
}
