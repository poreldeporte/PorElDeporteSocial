import { ChevronLeft } from '@tamagui/lucide-icons'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getScreenLayout } from '@my/app/navigation/layouts'
import { TermsOfServiceScreen } from 'app/features/legal/terms-of-service-screen'

import { FloatingHeaderLayout } from '../components/FloatingHeaderLayout'

const layout = getScreenLayout('legalTerms')

export default function Screen() {
  const router = useRouter()
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <FloatingHeaderLayout
          title={layout.title}
          leftIcon={ChevronLeft}
          onPressLeft={() => router.back()}
        >
        {({ scrollProps, HeaderSpacer, topInset }) => (
          <TermsOfServiceScreen
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
