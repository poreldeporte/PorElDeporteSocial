import { Button, FullscreenSpinner, YStack } from '@my/ui/public'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { X } from '@tamagui/lucide-icons'
import { WebView } from 'react-native-webview'

import { SHOP_URL } from './constants'

export const ShopScreen = ({ onClose }: { onClose?: () => void }) => {
  const insets = useSafeAreaInsets()
  const closeTop = 4
  return (
    <YStack f={1} bg="$color1">
      <WebView
        source={{ uri: SHOP_URL }}
        startInLoadingState
        renderLoading={() => <FullscreenSpinner />}
      />
      <Button
        pos="absolute"
        top={closeTop}
        left={12}
        size="$4"
        br="$10"
        bg="$orange9"
        color="$color1"
        icon={X}
        onPress={onClose ?? (() => undefined)}
        accessibilityLabel="Close shop"
        elevation="$3"
      />
    </YStack>
  )
}
