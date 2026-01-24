import { ProfileDrawerScreen } from 'app/features/profile/drawer-screen'
import { isProfileComplete } from 'app/utils/auth/profileCompletion'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useUser } from 'app/utils/useUser'
import { Redirect } from 'expo-router'
import { Stack } from 'expo-router'
import { Drawer } from 'expo-router/drawer'

export default function Layout() {
  const { user, profile, isLoading } = useUser()
  const { hasApprovedMembership, isLoading: isCommunityLoading } = useActiveCommunity()

  if (isLoading || isCommunityLoading) return null
  if (!user) return <Redirect href="/onboarding" />
  if (!isProfileComplete(profile)) return <Redirect href="/onboarding/profile" />
  if (!hasApprovedMembership) return <Redirect href="/communities/join" />

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
