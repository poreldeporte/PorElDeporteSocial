import { H2, Separator, XStack, YGroup, YStack, withStaticProperties, styled } from 'tamagui'

import { SettingItem } from './SettingItem'

const SettingsFrame = styled(YStack, {
  boc: '$color4',
  gap: '$5',
  f: 1,
})

const SettingsItems = styled(YStack, {
  gap: '$4',
  mx: '$3',

  '$platform-web': {
    gap: '$4',
    m: '$4',
    mx: '$3',
  },
})

const SettingsGroup = styled(YGroup, {
  bg: 'transparent',

  '$platform-native': {
    separator: (
      <XStack>
        <YStack w={20} bg="$color2" />
        <Separator boc="$color4" bw="$0.25" />
      </XStack>
    ),
  },
})

const SettingsTitle = styled(H2, {
  '$platform-web': {
    mx: '$6',
  },
  mx: '$4',
  py: '$4',
})

export const Settings = withStaticProperties(SettingsFrame, {
  Item: SettingItem,
  Items: SettingsItems,
  Group: SettingsGroup,
  Title: SettingsTitle,
})
