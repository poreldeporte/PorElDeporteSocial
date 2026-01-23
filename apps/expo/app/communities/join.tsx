import { ChevronLeft } from '@tamagui/lucide-icons'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { JoinCommunitiesScreen } from 'app/features/community/join-screen'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'

import { FloatingHeaderLayout } from '../../components/FloatingHeaderLayout'

export default function Screen() {
  const router = useRouter()
  const { hasApprovedMembership } = useActiveCommunity()
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <FloatingHeaderLayout
          title="Communities"
          leftIcon={hasApprovedMembership ? ChevronLeft : undefined}
          onPressLeft={hasApprovedMembership ? () => router.back() : undefined}
        >
          {({ scrollProps, HeaderSpacer, topInset }) => (
            <JoinCommunitiesScreen
              scrollProps={scrollProps}
              headerSpacer={HeaderSpacer}
              topInset={topInset}
            />
          )}
        </FloatingHeaderLayout>
      </SafeAreaView>
    </>
  )
}
