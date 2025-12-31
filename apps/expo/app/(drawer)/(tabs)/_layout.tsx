import { Button, SizableText, XStack, useTheme } from '@my/ui/public'
import { Plus, ShoppingBag, User } from '@tamagui/lucide-icons'
import { router, Stack, Tabs, usePathname } from 'expo-router'
import { Pressable } from 'react-native'

import { getRoutesById, navRoutes, nativeTabRouteIds } from '@my/app/navigation/routes'
import { getScreenLayout, type ScreenLayoutId } from '@my/app/navigation/layouts'
import { useUser } from '@my/app/utils/useUser'

export default function Layout() {
  const { accentColor, color1 } = useTheme()
  const headerBackground = color1?.val ?? '#fff'
  const pathname = usePathname()
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
    leaderboard: 'leaderboard',
    profile: 'profile',
  }
  const activeLayoutId = layoutByRoute[activeRoute.id] ?? 'tabsRoot'
  const headerTitle = (() => {
    if (activeRoute.id === 'home') return 'Por El Deporte'
    if (activeRoute.id === 'games') return 'Schedule'
    if (activeRoute.id === 'leaderboard') return 'Leaderboard'
    return getScreenLayout(activeLayoutId).title
  })()
  const tabBarHeight = 60

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
          headerLeft: () => {
            if (activeRoute.id === 'leaderboard') {
              return (
                <Button
                  chromeless
                  borderWidth={0}
                  borderStyle="unset"
                  onPress={() => router.navigate('/profile')}
                >
                  <User size={22} />
                </Button>
              )
            }
            if (activeRoute.id === 'games' && isAdmin) {
              return (
                <Button
                  chromeless
                  borderWidth={0}
                  borderStyle="unset"
                  icon={Plus}
                  onPress={() => {
                    router.navigate(createSegment)
                  }}
                >
                  Create
                </Button>
              )
            }
            return null
          },
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
                  router.navigate('/shop')
                }}
              >
                <ShoppingBag size={22} />
              </Button>
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
            height: tabBarHeight,
            alignContent: 'center',
            justifyContent: 'center',
          },
          tabBarButton: (props) => (
            <Pressable {...props} style={[props.style, { flex: 1 }]} />
          ),
        }}
      >
        {tabRoutes.map((route) => {
          const Icon = route.icon
          const isHome = route.id === 'home'
          return (
            <Tabs.Screen
              key={route.id}
              name={route.nativeSegment ?? route.id}
              options={{
                title: route.label,
                tabBarIcon: ({ size, focused }) => {
                  if (isHome) {
                    return (
                      <XStack
                        ai="center"
                        jc="center"
                        w={56}
                        h={56}
                        br={28}
                        backgroundColor={focused ? accentColor.val : '$color3'}
                      >
                        <Icon color={focused ? '$color1' : '$color11'} size={22} strokeWidth={2} />
                      </XStack>
                    )
                  }
                  return (
                    <Icon
                      color={focused ? accentColor.val : '$color10'}
                      size={size}
                      strokeWidth={2}
                    />
                  )
                },
              }}
            />
          )
        })}
        <Tabs.Screen
          name="profile"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="community/index"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  )
}
