import { Image } from 'react-native'

import { YStack } from '@my/ui/public'
import { brandIcon } from 'app/assets'

type BrandStampProps = {
  size?: number
}

export const BrandStamp = ({ size = 96 }: BrandStampProps) => {
  return (
    <YStack ai="center" py="$3">
      <Image
        source={brandIcon}
        accessibilityLabel="Brand icon"
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
    </YStack>
  )
}
