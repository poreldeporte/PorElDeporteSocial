import { ShoppingBag } from '@tamagui/lucide-icons'
import { useRouter } from 'expo-router'

import { getScreenLayout } from 'app/navigation/layouts'
import { LeaderboardScreen } from 'app/features/home/leaderboard-screen'

import { FloatingHeaderLayout } from '../../../components/FloatingHeaderLayout'

export default function Screen() {
  const router = useRouter()
  const layout = getScreenLayout('leaderboard')
  return (
    <FloatingHeaderLayout
      title={layout.title}
      rightIcon={ShoppingBag}
      onPressRight={() => router.navigate('/shop')}
    >
      {({ scrollProps, HeaderSpacer, topInset }) => (
        <LeaderboardScreen
          scrollProps={scrollProps}
          headerSpacer={HeaderSpacer}
          topInset={topInset}
        />
      )}
    </FloatingHeaderLayout>
  )
}
