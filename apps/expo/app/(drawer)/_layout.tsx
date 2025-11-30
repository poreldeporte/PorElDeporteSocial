import { ProfileDrawerScreen } from '@my/app/features/profile/drawer-screen'
import { Drawer } from 'expo-router/drawer'

export default function Layout() {
  return <Drawer drawerContent={ProfileDrawerScreen} screenOptions={{ headerShown: false }} />
}
