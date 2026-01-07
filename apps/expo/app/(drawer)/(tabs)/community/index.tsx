import { ChevronLeft } from '@tamagui/lucide-icons'
import { useRouter } from 'expo-router'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { CommunityScreen } from 'app/features/home/community-screen'

import { FloatingHeaderLayout } from '../../../../components/FloatingHeaderLayout'

export default function Screen() {
  const router = useRouter()
  const layout = getScreenLayout('community')
  return (
    <FloatingHeaderLayout
      title={layout.title}
      leftIcon={ChevronLeft}
      onPressLeft={() => router.back()}
    >
      {({ scrollProps, HeaderSpacer, topInset }) => (
        <CommunityScreen scrollProps={scrollProps} headerSpacer={HeaderSpacer} topInset={topInset} />
      )}
    </FloatingHeaderLayout>
  )
}
