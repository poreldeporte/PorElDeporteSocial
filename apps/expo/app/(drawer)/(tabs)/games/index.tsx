import { History, Plus } from '@tamagui/lucide-icons'
import { useRouter } from 'expo-router'

import { getScreenLayout } from 'app/navigation/layouts'
import { navRoutes } from 'app/navigation/routes'
import { useUser } from 'app/utils/useUser'
import { ScheduleScreen } from 'app/features/home/schedule-screen'

import { FloatingHeaderLayout } from '../../../../components/FloatingHeaderLayout'

export default function Screen() {
  const router = useRouter()
  const { isAdmin } = useUser()
  const layout = getScreenLayout('gamesList')
  const createSegment = navRoutes.create.nativeSegment ?? navRoutes.create.href
  const historyHref = '/games/history'
  const rightActions = isAdmin ? [{ icon: Plus, onPress: () => router.navigate(createSegment) }] : undefined
  return (
    <FloatingHeaderLayout
      title={layout.title}
      leftIcon={History}
      onPressLeft={() => router.navigate(historyHref)}
      rightIcon={undefined}
      onPressRight={undefined}
      rightActions={rightActions}
    >
      {({ scrollProps, HeaderSpacer, topInset }) => (
        <ScheduleScreen scrollProps={scrollProps} headerSpacer={HeaderSpacer} topInset={topInset} />
      )}
    </FloatingHeaderLayout>
  )
}
