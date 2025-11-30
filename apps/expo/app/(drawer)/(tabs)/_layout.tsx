import { Button, SizableText, XStack, useTheme } from '@my/ui'
import { Menu, Plus, ShoppingBag, Trophy, User } from '@tamagui/lucide-icons'
import { DrawerActions } from '@react-navigation/native'
import { router, Stack, Tabs, useNavigation, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { getRoutesById, navRoutes, nativeTabRouteIds } from '@my/app/navigation/routes'
import { getScreenLayout, type ScreenLayoutId } from '@my/app/navigation/layouts'
import { useUser } from '@my/app/utils/useUser'

export default function Layout() {
  const { accentColor, color1 } = useTheme()
  const headerBackground = color1?.val ?? '#fff'
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const tabRoutes = getRoutesById(nativeTabRouteIds)
  const createSegment = navRoutes.create.nativeSegment ?? navRoutes.create.href
  const { role } = useUser()
  const isAdmin = role === 'admin'
  const candidateRoutes = [...tabRoutes, navRoutes.profile]
  const activeRoute =
    candidateRoutes.find((route) => {
      if (!pathname) return false
      if (route.href === '/') return pathname === '/'
      return pathname.startsWith(route.href)
    }) ?? tabRoutes[0]
  const layoutByRoute: Record<string, ScreenLayoutId> = {
    home: 'tabsRoot',
    games: 'gamesList',
    community: 'community',
    leaderboard: 'leaderboard',
    profile: 'profile',
  }
  const activeLayoutId = layoutByRoute[activeRoute.id] ?? 'tabsRoot'
  const headerTitle = getScreenLayout(activeLayoutId).title
  const tabPaddingBottom = insets.bottom + 20
  const navigation = useNavigation()
  const showDrawerButton = activeRoute.id === 'profile' && pathname?.startsWith('/profile')

  if (__DEV__) {
    console.log('pathname', pathname)
  }
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <SizableText fontWeight="700" size="$4">
              {headerTitle}
            </SizableText>
          ),
          headerLeft: () => (
            <XStack gap="$2">
              <Button
                chromeless
                borderWidth={0}
                borderStyle="unset"
                onPress={() => router.navigate('/profile')}
              >
                <User size={22} />
              </Button>
              {showDrawerButton ? (
                <Button
                  chromeless
                  borderWidth={0}
                  borderStyle="unset"
                  onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                >
                  <Menu size={24} />
                </Button>
              ) : null}
            </XStack>
          ),
          headerTintColor: accentColor.val,
          headerStyle: { backgroundColor: headerBackground },
          headerBackTitleStyle: { fontSize: 16, textTransform: 'lowercase' },
          headerRight: () => (
            <XStack gap="$2" mr="$-1">
              <Button
                borderStyle="unset"
                borderWidth={0}
                backgroundColor="transparent"
                onPress={() => {
                  router.navigate('/leaderboard')
                }}
              >
                <Trophy size={22} />
              </Button>
              <Button
                borderStyle="unset"
                borderWidth={0}
                backgroundColor="transparent"
                onPress={() => {
                  router.navigate('/shop')
                }}
              >
                <ShoppingBag size={22} />
              </Button>
              {isAdmin ? (
                <Button
                  borderStyle="unset"
                  borderWidth={0}
                  backgroundColor="transparent"
                  onPress={() => {
                    router.navigate(createSegment)
                  }}
                >
                  <Plus size={24} />
                </Button>
              ) : null}
            </XStack>
          ),
        }}
      />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          headerTintColor: accentColor.val,
          tabBarStyle: {
            paddingTop: 10,
            paddingBottom: tabPaddingBottom,
            height: 60,
            alignContent: 'center',
            justifyContent: 'center',
          },
          tabBarItemStyle: {
            paddingBottom: 10,
          },
        }}
      >
        {tabRoutes.map((route) => {
          const Icon = route.icon
          return (
            <Tabs.Screen
              key={route.id}
              name={route.nativeSegment ?? route.id}
              options={{
                title: route.label,
                tabBarIcon: ({ size, focused }) => (
                  <Icon
                    color={focused ? accentColor.val : '$color10'}
                    size={size}
                    strokeWidth={2}
                  />
                ),
              }}
            />
          )
        })}
      </Tabs>
    </>
  )
}
