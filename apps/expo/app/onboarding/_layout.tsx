import { isProfileApproved } from '@my/app/utils/auth/profileApproval'
import { isProfileComplete } from '@my/app/utils/auth/profileCompletion'
import { useUser } from '@my/app/utils/useUser'
import { Redirect, Stack, usePathname } from 'expo-router'

export default function Layout() {
  const { user, profile, isLoading } = useUser()
  const pathname = usePathname()

  if (isLoading) return null
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
  if (!isProfileApproved(profile)) {
    return pathname?.startsWith('/onboarding') ? (
      <Stack
        screenOptions={{ headerShown: false, headerTitleAlign: 'center', headerBackTitleVisible: false }}
      />
    ) : (
      <Redirect href="/onboarding/review" />
    )
  }
  return <Redirect href="/" />
}
