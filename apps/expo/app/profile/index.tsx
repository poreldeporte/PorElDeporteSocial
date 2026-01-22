import { ChevronLeft, Settings } from '@tamagui/lucide-icons'
import { useRouter } from 'expo-router'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { ProfileScreen } from '@my/app/features/profile/screen'

import { FloatingHeaderLayout } from '../../components/FloatingHeaderLayout'

export default function Screen() {
  const router = useRouter()
  const layout = getScreenLayout('profile')
  return (
    <FloatingHeaderLayout
      title={layout.title}
      leftIcon={ChevronLeft}
      onPressLeft={() => router.back()}
      rightIcon={Settings}
      onPressRight={() => router.push('/settings')}
    >
      {({ scrollProps, HeaderSpacer, topInset }) => (
        <ProfileScreen scrollProps={scrollProps} headerSpacer={HeaderSpacer} topInset={topInset} />
      )}
    </FloatingHeaderLayout>
  )
}
