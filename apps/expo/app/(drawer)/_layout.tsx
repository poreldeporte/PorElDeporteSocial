import { ProfileDrawerScreen } from '@my/app/features/profile/drawer-screen'
import { isProfileApproved } from '@my/app/utils/auth/profileApproval'
import { isProfileComplete } from '@my/app/utils/auth/profileCompletion'
import { useUser } from '@my/app/utils/useUser'
import { Redirect } from 'expo-router'
import { Stack } from 'expo-router'
import { Drawer } from 'expo-router/drawer'

export default function Layout() {
  const { user, profile, isLoading } = useUser()

  if (isLoading) return null
  if (!user) return <Redirect href="/onboarding" />
  if (!isProfileComplete(profile)) return <Redirect href="/onboarding/profile" />
  if (!isProfileApproved(profile)) return <Redirect href="/onboarding/review" />

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <Drawer
        drawerContent={ProfileDrawerScreen}
        screenOptions={{ headerShown: false, swipeEnabled: false, swipeEdgeWidth: 0 }}
      />
    </>
  )
}
