import { isProfileComplete } from 'app/utils/auth/profileCompletion'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useUser } from 'app/utils/useUser'
import { Redirect, Stack, usePathname } from 'expo-router'

export default function Layout() {
  const { user, profile, isLoading } = useUser()
  const { hasApprovedMembership, isLoading: isCommunityLoading } = useActiveCommunity()
  const pathname = usePathname()

  if (isLoading || isCommunityLoading) return null
  if (!user) {
    return pathname?.startsWith('/onboarding') ? (
      <Stack
        screenOptions={{ headerShown: false, headerTitleAlign: 'center', headerBackTitleVisible: false }}
      />
    ) : (
      <Redirect href="/onboarding" />
    )
  }
  if (!isProfileComplete(profile)) {
    return pathname?.startsWith('/onboarding') ? (
      <Stack
        screenOptions={{ headerShown: false, headerTitleAlign: 'center', headerBackTitleVisible: false }}
      />
    ) : (
      <Redirect href="/onboarding/profile" />
    )
  }
  if (!hasApprovedMembership) return <Redirect href="/communities/join" />
  return <Redirect href="/" />
}
