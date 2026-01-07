import { Stack, Tabs } from 'expo-router'

import { getRoutesById, nativeTabRouteIds } from '@my/app/navigation/routes'
import { BottomDockTabBar } from '../../../navigation/BottomDockTabBar'

export default function Layout() {
  const tabRoutes = getRoutesById(nativeTabRouteIds)

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Tabs
        tabBar={(props) => <BottomDockTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        {tabRoutes.map((route) => {
          return (
            <Tabs.Screen
              key={route.id}
              name={route.nativeSegment ?? route.id}
              options={{
                title: route.label,
              }}
            />
          )
        })}
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
