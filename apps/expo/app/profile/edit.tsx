import { ChevronLeft } from '@tamagui/lucide-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getScreenLayout } from 'app/navigation/layouts'
import { EditProfileScreen } from 'app/features/profile/edit-screen'

import { FloatingHeaderLayout } from '../../components/FloatingHeaderLayout'

export default function Screen() {
  const router = useRouter()
  const layout = getScreenLayout('profileEdit')
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
      <FloatingHeaderLayout
        title={layout.title}
        leftIcon={ChevronLeft}
        onPressLeft={() => router.back()}
      >
        {({ scrollProps, HeaderSpacer, topInset }) => (
          <EditProfileScreen
            scrollProps={scrollProps}
            headerSpacer={HeaderSpacer}
            topInset={topInset}
          />
        )}
      </FloatingHeaderLayout>
    </SafeAreaView>
  )
}
