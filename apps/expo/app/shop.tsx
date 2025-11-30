import { ShopScreen } from 'app/features/shop'
import { getScreenLayout } from '@my/app/navigation/layouts'
import { Stack, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const layout = getScreenLayout('shop')

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ShopScreen onClose={() => router.back()} />
      </SafeAreaView>
    </>
  )
}
