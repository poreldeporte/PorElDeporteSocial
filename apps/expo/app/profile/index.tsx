import { ChevronLeft, Settings } from '@tamagui/lucide-icons'
import { useRouter } from 'expo-router'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { ProfileScreen } from '@my/app/features/profile/screen'
import { useUser } from '@my/app/utils/useUser'

import { FloatingHeaderLayout } from '../../components/FloatingHeaderLayout'

export default function Screen() {
  const router = useRouter()
  const layout = getScreenLayout('profile')
  const { role } = useUser()
  const isAdmin = role === 'admin'
  return (
    <FloatingHeaderLayout
      title={layout.title}
      leftIcon={ChevronLeft}
      onPressLeft={() => router.back()}
      rightIcon={isAdmin ? Settings : undefined}
      onPressRight={isAdmin ? () => router.push('/settings/community') : undefined}
    >
      {({ scrollProps, HeaderSpacer, topInset }) => (
        <ProfileScreen scrollProps={scrollProps} headerSpacer={HeaderSpacer} topInset={topInset} />
      )}
    </FloatingHeaderLayout>
  )
}
