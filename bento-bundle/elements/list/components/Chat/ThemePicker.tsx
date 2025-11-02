import { useEffect, useMemo, useRef } from 'react'
import { Pressable } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { ScrollView, Text, View, type ThemeName } from 'tamagui'
import { useTheme } from './ChatContext'

const AnimatedView = Animated.createAnimatedComponent(View)

const WIDTH = 100
const gap = 24

type Theme = {
  emoji: string
  theme: ThemeName
}

type ThemePicker = {
  themeColor: ThemeName
  setThemeColor: (color: ThemeName) => void
}

const themes: Theme[] = [
  {
    emoji: '🌙',
    theme: 'alt1',
  },
  {
    emoji: '🐝',
    theme: 'cyan',
  },
  {
    emoji: '🦋',
    theme: 'jade',
  },
  {
    emoji: '🥑',
    theme: 'teal',
  },
  {
    emoji: '🌋',
    theme: 'forest',
  },
]

const space = 6
const SELECTED_THEME_WIDTH = WIDTH + space * 2
const ASPECT_RATIO = 1 / 1.2

const SPRING_CONFIG = {
  damping: 18,
  mass: 0.5,
  stiffness: 180,
}

export const ThemePicker = () => {
  const { theme, setTheme } = useTheme()
  const x = useSharedValue(0)
  const ref = useRef<ScrollView>(null)

  const offset = useMemo(() => {
    const index = themes.findIndex((t) => t.theme === theme)

    return (index < 0 ? 0 : index) * (WIDTH + gap)
  }, [theme])

  useEffect(() => {
    x.value = withSpring(offset, SPRING_CONFIG)
    ref.current?.scrollTo({ x: offset / 2, y: 0, animated: true })
  }, [offset])

  const style = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: x.value }],
    }
  })

  return (
    <ScrollView
      ref={ref}
      showsHorizontalScrollIndicator={false}
      horizontal
      contentContainerStyle={{ gap, px: 18 }}
      py={space * 2}
    >
      {themes.map((theme) => (
        <ThemeItem key={theme.theme} {...theme} setTheme={setTheme} />
      ))}
      <AnimatedView
        w={SELECTED_THEME_WIDTH}
        aspectRatio={ASPECT_RATIO}
        theme={theme}
        // bg="$background"
        borderRadius="$6"
        borderCurve="circular"
        borderColor="$color10"
        gap="$3"
        left={18 - space}
        top={-space - 1}
        position="absolute"
        borderWidth={1.5}
        style={style}
      />
    </ScrollView>
  )
}

const ThemeItem = ({
  emoji,
  theme,
  setTheme,
}: Theme & { setTheme: (theme: ThemeName) => void }) => {
  return (
    <Pressable onPress={() => setTheme(theme)}>
      <View
        overflow="hidden"
        w={WIDTH}
        aspectRatio={ASPECT_RATIO}
        theme={theme}
        bg="$background"
        borderRadius="$4"
        p="$2"
        gap="$2"
      >
        <View h="$1" borderRadius="$3" borderCurve="circular" bg="$color10" width="80%" />

        <View
          bg="$color3"
          h="$1"
          borderRadius="$3"
          width="60%"
          alignSelf="flex-end"
          borderCurve="circular"
        />

        <Text
          position="absolute"
          left={0}
          right={0}
          bottom={'$2'}
          textAlign="center"
          fontSize="$8"
          fontWeight="bold"
        >
          {emoji}
        </Text>
      </View>
    </Pressable>
  )
}
