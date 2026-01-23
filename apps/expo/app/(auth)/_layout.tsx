import { Redirect, Stack } from 'expo-router'

import { isProfileComplete } from '@my/app/utils/auth/profileCompletion'
import { useActiveCommunity } from '@my/app/utils/useActiveCommunity'
import { useUser } from '@my/app/utils/useUser'
import { Spinner, YStack } from '@my/ui/public'

export default function Layout() {
  const { user, profile, isLoading } = useUser()
  const { hasApprovedMembership, isLoading: isCommunityLoading } = useActiveCommunity()

  if (isLoading || isCommunityLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <YStack f={1} ai="center" jc="center">
          <Spinner size="small" />
        </YStack>
      </>
    )
  }
  if (user) {
    if (!isProfileComplete(profile)) return <Redirect href="/onboarding/profile" />
    if (!hasApprovedMembership) return <Redirect href="/communities/join" />
    return <Redirect href="/" />
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Stack screenOptions={{ headerTitleAlign: 'center', headerBackTitleVisible: false }} />
    </>
  )
}
