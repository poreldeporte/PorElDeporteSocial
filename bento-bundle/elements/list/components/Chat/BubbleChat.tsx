import { Pressable } from 'react-native'
import { Image, Text, useThemeName, View } from 'tamagui'

type User = {
  id: string
  name: string
  avatar: string
  status?: string
  new?: boolean
}

export type MessageItem = {
  id: string
  message?: string
  createdAt: number
  user?: User
  seen?: boolean
  sticker?: string
}

type BubbleProps = {
  item: MessageItem
}

export const BubbleChat = (props: BubbleProps) => {
  const { item } = props

  const received = !!item.user
  const isSticker = !!item.sticker
  const theme = useThemeName()

  return (
    <Pressable {...props}>
      <View
        theme={
          theme.includes('alt1') || theme === 'light' || theme === 'dark'
            ? 'blue'
            : theme
        }
        alignSelf={received ? 'flex-start' : 'flex-end'}
        backgroundColor={'$color10'}
        {...(!received && {
          // theme: 'accent',
          backgroundColor: '$color3',
          alignSelf: 'flex-end',
        })}
        borderRadius={'$7'}
        borderCurve="continuous"
        padding={'$3'}
        maxWidth="80%"
      >
        {item.sticker ? (
          <Image source={{ uri: item.sticker }} />
        ) : (
          <Text themeInverse={received}>{item.message}</Text>
        )}
      </View>
    </Pressable>
  )
}
