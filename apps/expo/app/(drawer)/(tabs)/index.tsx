import { ShoppingBag, User } from '@tamagui/lucide-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { navRoutes } from '@my/app/navigation/routes'
import { HomeScreen } from 'app/features/home/screen'
import { CommunitySwitcherSheet } from 'app/features/community/community-switcher-sheet'
import { CommunitySwitcherProvider } from 'app/provider/community-switcher'
import { useActiveCommunity } from '@my/app/utils/useActiveCommunity'

import { FloatingHeaderLayout } from '../../../components/FloatingHeaderLayout'

export default function Screen() {
  const router = useRouter()
  const layout = getScreenLayout('tabsRoot')
  const { activeCommunity } = useActiveCommunity()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const title = activeCommunity?.name ?? layout.title
  const profileHref = navRoutes.profile.href
  const openCommunitySwitcher = () => setSwitcherOpen(true)
  const rightActions = [
    {
      icon: ShoppingBag,
      onPress: () => router.navigate('/shop'),
      label: 'Shop',
      variant: 'dark' as const,
    },
  ]

  return (
    <CommunitySwitcherProvider onOpen={openCommunitySwitcher}>
      <CommunitySwitcherSheet open={switcherOpen} onOpenChange={setSwitcherOpen} />
      <FloatingHeaderLayout
        title={title}
        leftIcon={User}
        onPressLeft={() => router.push(profileHref)}
        rightActions={rightActions}
      >
        {({ scrollProps, HeaderSpacer, topInset }) => (
          <HomeScreen scrollProps={scrollProps} headerSpacer={HeaderSpacer} topInset={topInset} />
        )}
      </FloatingHeaderLayout>
    </CommunitySwitcherProvider>
  )
}
