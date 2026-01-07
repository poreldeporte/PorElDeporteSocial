import type { ScrollViewProps } from 'react-native'
import { type ReactNode } from 'react'

import { Paragraph, ScrollView, Text, YStack } from '@my/ui/public'
import { screenContentContainerStyle } from 'app/constants/layout'
import { Link } from 'expo-router'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const AboutScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const baseContentStyle = headerSpacer
    ? { ...screenContentContainerStyle, paddingTop: 0 }
    : screenContentContainerStyle
  const mergedContentStyle = Array.isArray(contentContainerStyle)
    ? [baseContentStyle, ...contentContainerStyle]
    : [baseContentStyle, contentContainerStyle]
  return (
    <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
      {headerSpacer}
      <YStack gap="$4">
        <Link href="/create">
          <Text>go to modal</Text>
        </Link>
        <Paragraph>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae quidem neque maxime
          soluta nostrum unde eligendi, culpa qui exercitationem modi quasi debitis voluptatibus,
          deleniti porro! Nihil magni dicta neque aliquid.
        </Paragraph>

        <Paragraph>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae quidem neque maxime
          soluta nostrum unde eligendi, culpa qui exercitationem modi quasi debitis voluptatibus,
          deleniti porro! Nihil magni dicta neque aliquid.
        </Paragraph>

        <Paragraph>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae quidem neque maxime
          soluta nostrum unde eligendi, culpa qui exercitationem modi quasi debitis voluptatibus,
          deleniti porro! Nihil magni dicta neque aliquid.
        </Paragraph>
      </YStack>
    </ScrollView>
  )
}
