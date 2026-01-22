import type { ImageStyle, StyleProp } from 'react-native'
import { StyleSheet } from 'react-native'
import { useBrand } from 'app/provider/brand'
import { SolitoImage } from 'solito/image'

export const WATERMARK_SIZE = 140

type WatermarkLogoProps = {
  style?: StyleProp<ImageStyle>
  opacity?: number
}

export const WatermarkLogo = ({ style, opacity = 0.06 }: WatermarkLogoProps) => {
  const { logo } = useBrand()
  return (
    <SolitoImage
      src={logo}
      alt="Por El Deporte crest"
      width={WATERMARK_SIZE}
      height={WATERMARK_SIZE}
      style={StyleSheet.flatten([
        {
          position: 'absolute',
          opacity,
        },
        style,
      ])}
    />
  )
}
