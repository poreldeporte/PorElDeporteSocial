import { StyleSheet, type ScrollViewProps } from 'react-native'
import { type ReactNode } from 'react'

import { Card, Paragraph, ScrollView, Text, YStack } from '@my/ui/public'
import { profileBannerCommunity, welcomeHero } from 'app/assets'
import { BrandStamp } from 'app/components/BrandStamp'
import { SCREEN_CONTENT_PADDING, screenContentContainerStyle } from 'app/constants/layout'
import { useBrand } from 'app/provider/brand'
import { SolitoImage } from 'solito/image'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const AboutScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const { logo } = useBrand()
  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const baseContentStyle = headerSpacer
    ? { ...screenContentContainerStyle, paddingTop: 0 }
    : screenContentContainerStyle
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
  )
  return (
    <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
      {headerSpacer}
      <YStack gap="$4">
        <YStack gap="$4" px={SCREEN_CONTENT_PADDING.horizontal}>
          <Card bordered bw={1} boc="$color12" br="$5" overflow="hidden" p={0}>
            <SolitoImage
              src={profileBannerCommunity}
              alt="Community banner"
              width={1200}
              height={600}
              style={{ width: '100%', height: undefined, aspectRatio: 3 / 2 }}
            />
          </Card>
          <Card bordered bw={1} boc="$color12" br="$5" p="$4" gap="$3">
            <YStack ai="center">
              <SolitoImage src={logo} alt="Por El Deporte crest" width={144} height={144} />
            </YStack>
            <Paragraph>
              Our journey together has been about more than just winning games; it's been about
              building lasting relationships, supporting each other through victories and defeats, and
              creating memories that we'll cherish forever.
            </Paragraph>
            <Paragraph>
              Every member plays a vital role in shaping this amazing community, bringing unique
              strengths and perspectives that enrich our collective experience.
            </Paragraph>
          </Card>
          <Card bordered bw={1} boc="$color12" br="$5" overflow="hidden" p={0}>
            <SolitoImage
              src={welcomeHero}
              alt="Guido thumbs up"
              width={1200}
              height={600}
              style={{ width: '100%', height: undefined, aspectRatio: 3 / 2 }}
            />
          </Card>
          <Card bordered bw={1} boc="$color12" br="$5" p="$4" gap="$3">
            <Text fontSize={18} fontWeight="700">
              Core Values of Por El Deporte
            </Text>
            <YStack gap="$3">
              <Card bordered bw={1} boc="$color12" br="$4" p="$3" gap="$1">
                <Text fontSize={16} fontWeight="700">
                  Community
                </Text>
                <Paragraph>
                  Building a vibrant Miami soccer community where fans connect through shared
                  events, matches, and passion for the game since 2014.
                </Paragraph>
              </Card>
              <Card bordered bw={1} boc="$color12" br="$4" p="$3" gap="$1">
                <Text fontSize={16} fontWeight="700">
                  Respect
                </Text>
                <Paragraph>
                  Honoring the spirit of fair play, valuing opponents, teammates, and soccer
                  traditions in every aspect of our club.
                </Paragraph>
              </Card>
              <Card bordered bw={1} boc="$color12" br="$4" p="$3" gap="$1">
                <Text fontSize={16} fontWeight="700">
                  Lifestyle
                </Text>
                <Paragraph>
                  Embracing an active, healthy lifestyle inspired by tropical Miami vibes, blending
                  soccer passion with everyday comfort in our gear.
                </Paragraph>
              </Card>
            </YStack>
          </Card>
          <BrandStamp />
        </YStack>
      </YStack>
    </ScrollView>
  )
}
