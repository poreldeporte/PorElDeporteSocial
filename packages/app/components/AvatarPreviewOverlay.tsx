import { Image } from 'react-native'

import { YStack } from '@my/ui/public'

type AvatarPreviewOverlayProps = {
  open: boolean
  uri?: string | null
  onClose: () => void
  maxWidth?: number
  overlayOpacity?: number
}

export const AvatarPreviewOverlay = ({
  open,
  uri,
  onClose,
  maxWidth = 320,
  overlayOpacity = 0.5,
}: AvatarPreviewOverlayProps) => {
  if (!open || !uri) return null
  return (
    <YStack position="absolute" top={0} right={0} bottom={0} left={0} zIndex={200000}>
      <YStack
        position="absolute"
        top={0}
        right={0}
        bottom={0}
        left={0}
        bg="$color12"
        o={overlayOpacity}
        onPress={onClose}
      />
      <YStack ai="center" jc="center" f={1}>
        <YStack
          w="80%"
          maxWidth={maxWidth}
          aspectRatio={1}
          br={999}
          overflow="hidden"
          bg="$color2"
          onPress={onClose}
          pressStyle={{ opacity: 0.9 }}
          accessibilityRole="button"
        >
          <Image source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        </YStack>
      </YStack>
    </YStack>
  )
}
