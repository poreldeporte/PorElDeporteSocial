import { ChevronLeft } from '@tamagui/lucide-icons'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { MemberApprovalsScreen } from 'app/features/admin/member-approvals-screen'
import { getScreenLayout } from 'app/navigation/layouts'

import { FloatingHeaderLayout } from '../../../components/FloatingHeaderLayout'

const layout = getScreenLayout('adminApplications')

export default function Screen() {
  const router = useRouter()
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <FloatingHeaderLayout
          title={layout.title}
          leftIcon={ChevronLeft}
          onPressLeft={() => router.back()}
        >
          {({ scrollProps, HeaderSpacer, topInset }) => (
            <MemberApprovalsScreen
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
