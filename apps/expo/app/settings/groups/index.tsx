import { ChevronLeft, Plus } from '@tamagui/lucide-icons'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { GroupListScreen } from 'app/features/settings/group-list-screen'
import { getScreenLayout } from 'app/navigation/layouts'

import { FloatingHeaderLayout } from '../../../components/FloatingHeaderLayout'

const layout = getScreenLayout('settingsGroups')

export default function Screen() {
  const router = useRouter()
  const rightActions = [
    {
      icon: Plus,
      onPress: () => router.push('/settings/groups/new'),
    },
  ]

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <FloatingHeaderLayout
          title={layout.title}
          leftIcon={ChevronLeft}
          onPressLeft={() => router.back()}
          rightActions={rightActions}
        >
          {({ scrollProps, HeaderSpacer, topInset }) => (
            <GroupListScreen
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
