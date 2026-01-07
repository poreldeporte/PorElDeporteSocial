import { ShoppingBag, User } from '@tamagui/lucide-icons'
import { useRouter } from 'expo-router'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { navRoutes } from '@my/app/navigation/routes'
import { HomeScreen } from 'app/features/home/screen'

import { FloatingHeaderLayout } from '../../../components/FloatingHeaderLayout'

export default function Screen() {
  const router = useRouter()
  const layout = getScreenLayout('tabsRoot')
  const profileHref = navRoutes.profile.href
  return (
    <FloatingHeaderLayout
      title={layout.title}
      leftIcon={User}
      onPressLeft={() => router.push(profileHref)}
      rightIcon={ShoppingBag}
      onPressRight={() => router.navigate('/shop')}
    >
      {({ scrollProps, HeaderSpacer, topInset }) => (
        <HomeScreen scrollProps={scrollProps} headerSpacer={HeaderSpacer} topInset={topInset} />
      )}
    </FloatingHeaderLayout>
  )
}
