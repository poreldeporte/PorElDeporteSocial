import { History, Plus, ShoppingBag } from '@tamagui/lucide-icons'
import { useRouter } from 'expo-router'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { navRoutes } from '@my/app/navigation/routes'
import { useUser } from '@my/app/utils/useUser'
import { ScheduleScreen } from 'app/features/home/schedule-screen'

import { FloatingHeaderLayout } from '../../../../components/FloatingHeaderLayout'

export default function Screen() {
  const router = useRouter()
  const { role } = useUser()
  const isAdmin = role === 'admin'
  const layout = getScreenLayout('gamesList')
  const createSegment = navRoutes.create.nativeSegment ?? navRoutes.create.href
  const historyHref = '/games/history'
  const shopHref = '/shop'
  const rightActions = isAdmin
    ? [
        { icon: Plus, onPress: () => router.navigate(createSegment) },
        { icon: ShoppingBag, onPress: () => router.navigate(shopHref) },
      ]
    : undefined
  return (
    <FloatingHeaderLayout
      title={layout.title}
      leftIcon={History}
      onPressLeft={() => router.navigate(historyHref)}
      rightIcon={isAdmin ? undefined : ShoppingBag}
      onPressRight={isAdmin ? undefined : () => router.navigate(shopHref)}
      rightActions={rightActions}
    >
      {({ scrollProps, HeaderSpacer, topInset }) => (
        <ScheduleScreen scrollProps={scrollProps} headerSpacer={HeaderSpacer} topInset={topInset} />
      )}
    </FloatingHeaderLayout>
  )
}
