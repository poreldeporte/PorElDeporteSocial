import { ProfileScreen } from '@my/app/features/profile/screen'
import { Drawer } from 'expo-router/drawer'

export default function Layout() {
  return <Drawer drawerContent={ProfileScreen} />
}
