import { SolitoImage } from 'solito/image'

import { YStack } from '@my/ui/public'
import { brandIcon } from 'app/assets'

type BrandStampProps = {
  size?: number
}

export const BrandStamp = ({ size = 96 }: BrandStampProps) => {
  return (
    <YStack ai="center" py="$3">
      <SolitoImage src={brandIcon} alt="Brand icon" width={size} height={size} />
    </YStack>
  )
}
