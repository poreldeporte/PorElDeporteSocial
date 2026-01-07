import { isProfileApproved } from '@my/app/utils/auth/profileApproval'
import { isProfileComplete } from '@my/app/utils/auth/profileCompletion'
import { useUser } from '@my/app/utils/useUser'
import { Redirect, Stack } from 'expo-router'

export default function Layout() {
  const { user, profile, isLoading } = useUser()

  if (isLoading) return null
  if (user) {
    if (!isProfileComplete(profile)) return <Redirect href="/onboarding/profile" />
    if (!isProfileApproved(profile)) return <Redirect href="/onboarding/review" />
    return <Redirect href="/" />
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Stack screenOptions={{ headerTitleAlign: 'center', headerBackTitleVisible: false }} />
    </>
  )
}
