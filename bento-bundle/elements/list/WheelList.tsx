import { useState } from 'react'
import type { ImageSourcePropType } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { Image, isWeb, styled, Text, type ThemeName, View, YStack } from 'tamagui'

const AnimatedView = Animated.createAnimatedComponent(View)
const AnimatedList = styled(Animated.FlatList<CardData>, {
  flex: 1,
})

export function WheelList({
  onChange,
}: { onChange?: (item: CardData, index: number) => void }) {
  const [index, setIndex] = useState(0)

  const scrollY = useSharedValue(0)

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        'worklet'

        const value = event.contentOffset.y

        let i = Math.round(value / (ITEM_SIZE + SPACING))

        if (i >= 0) {
          // bounce value
          if (index > data.length - 1) {
            i = data.length - 1
          }

          runOnJS(setIndex)(i)

          if (typeof onChange === 'function') runOnJS(onChange)(data[i], i)
        }

        scrollY.value = value
      },

      onMomentumEnd: (event) => {
        'worklet'

        const value = event.contentOffset.y
        scrollY.value = Math.round(value)
      },

      onEndDrag: (event) => {
        'worklet'

        const value = event.contentOffset.y
        scrollY.value = Math.round(value)
      },
    },
    [index]
  )

  return (
    <View
      f={1}
      pos="relative"
      h={isWeb ? '80vh' : '100%'}
      $gtLg={{ maxHeight: 600 }}
      w="100%"
      jc="center"
      theme={data[index]?.theme}
    >
      <View pos="absolute" inset={0}>
        {data.map((item, index) => (
          <BackgroundView key={item.id} index={index} scrollY={scrollY} />
        ))}
      </View>
      <Slider scrollY={scrollY} />

      <AnimatedList
        onScroll={scrollHandler}
        renderItem={({ item, index }) => (
          <CardItem index={index} cardItem={item} scrollY={scrollY} />
        )}
        data={data}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToInterval={SIZE_RANGE}
        snapToEnd={true}
        pagingEnabled={!isWeb}
        contentContainerStyle={{
          gap: SPACING,
          paddingTop: isWeb ? 300 : '100%',
          paddingBottom: isWeb ? 0 : '100%',
          paddingHorizontal: SPACING,
        }}
      />

      <View pos="absolute" gap="$2" top={0} left={0} right={0} p="$4">
        <Text zIndex={1} fontWeight="800" ff="$heading" fontSize="$10">
          Influencer
        </Text>
        <Text zIndex={1} fontWeight="500" ff="$mono" color="$color10" fontSize="$8">
          {data.length} Contacts
        </Text>
      </View>
    </View>
  )
}

const CardItem = ({
  scrollY,
  cardItem,
  index,
}: {
  scrollY: SharedValue<number>
  cardItem: CardData
  index: number
}) => {
  const inputRange = getInputRange(index)

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      scrollY.value,
      inputRange,
      [60, 45, 20, 0, -20, -45, 60],
      Extrapolation.CLAMP
    )

    const translateY = interpolate(scrollY.value, inputRange, [
      SPACING * 12,
      SPACING * 10,
      SPACING * 2,
      0,
      -SPACING * 2,
      -SPACING * 10,
      -SPACING * 12,
    ])

    const translateX = interpolate(
      scrollY.value,
      inputRange,
      [-SPACING * 6, 0, 0, 0, 0, 0, SPACING * 6],
      Extrapolation.CLAMP
    )

    // const opacity = interpolate(scrollY.value, inputRange, [0.5, 1, 0.5])
    return {
      transform: [
        { rotate: `${rotate}deg` },
        { translateY },
        { translateX },
        // { scale },
        // { opacity },
      ],
    }
  })

  return (
    <AnimatedView
      theme={cardItem.theme}
      w="95%"
      $gtSm={{ w: 300 }}
      h={ITEM_SIZE}
      bg={cardItem.backgroundColor}
      p="$2"
      br="$8"
      style={animatedStyle}
      flexDirection="row"
      // jc="center"
      ai="center"
      gap="$4"
      shadowColor="$shadow3"
      shadowOffset={{ width: 0, height: 0 }}
      shadowOpacity={0.3}
      shadowRadius={'$6'}
      borderWidth={2}
      borderColor="$color3"
    >
      <View h="100%" overflow="hidden" aspectRatio={1} br="$6" bg="$color1">
        <Image
          h="100%"
          w="100%"
          source={cardItem.image}
          objectFit="cover"
          pos="absolute"
          inset={0}
        />
      </View>
      <YStack px="$2" gap="$2" flex={1}>
        <Text
          color="white"
          textTransform="capitalize"
          ff="$heading"
          fontWeight="bold"
          fontSize={'$8'}
        >
          {cardItem.title}
        </Text>
        <Text fontSize="$3" ff="$mono" color="white" opacity={0.8}>
          {cardItem.description}
        </Text>
      </YStack>
    </AnimatedView>
  )
}

const BackgroundView = ({
  index,
  scrollY,
}: { index: number; scrollY: SharedValue<number> }) => {
  const inputRange = getInputRange(index)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, inputRange, [0, 0, 0.2, 1, 0.2, 0, 0]),
      // opacity: 1,
      // backgroundColor: interpolateColor(
      //   scrollY.value,
      //   inputRange,
      //   data.map((item) => item.backgroundColor)
      // ),
    }
  })

  return (
    <AnimatedView
      theme={data[index].theme}
      bg={'$color3'}
      pos="absolute"
      inset={0}
      style={animatedStyle}
      justifyContent="space-between"
    />
  )
}

const Slider = ({ scrollY }: { scrollY: SharedValue<number> }) => {
  return (
    <YStack
      top={0}
      pos="absolute"
      bottom={0}
      left={0}
      jc="center"
      ai="flex-end"
      alignSelf="center"
      right={'$4'}
      gap="$2"
    >
      {data.map((item, index) => (
        <SliderItem scrollY={scrollY} key={item.id} index={index} />
      ))}
    </YStack>
  )
}

const SliderItem = ({
  scrollY,
  index,
}: { scrollY: SharedValue<number>; index: number }) => {
  const inputRange = getInputRange(index + 1)

  const animatedStyle = useAnimatedStyle(() => {
    const width = interpolate(
      scrollY.value,
      inputRange,
      [8, 16, 24, 16, 8],
      Extrapolation.CLAMP
    )

    return {
      width: width || 8,
      h: 4,
    }
  })

  return <AnimatedView br="$6" h={4} bg="$color10" style={animatedStyle} />
}

type CardData = {
  id: number
  title: string
  image: ImageSourcePropType
  backgroundColor: string
  theme?: ThemeName
  description: string
}

const data: CardData[] = [
  {
    id: 1,
    title: 'MR Beast',
    image: {
      uri: `https://tamagui.dev/bento/images/wheel-list/wl_1.png`,
    },

    description: '100M Subscribers',
    backgroundColor: '#205781',
    theme: 'neonBlue',
  },
  {
    id: 2,
    title: 'Lionel',
    image: {
      uri: `https://tamagui.dev/bento/images/wheel-list/wl_2.png`,
    },
    description: '10M Subscribers',
    backgroundColor: '#4F959D',
    theme: 'cyan',
  },
  {
    id: 3,
    title: 'Kylie Jenner',
    image: {
      uri: `https://tamagui.dev/bento/images/wheel-list/wl_3.png`,
    },
    description: '32M Subscribers',
    backgroundColor: '#1B4D3E',
    theme: 'forest',
  },
  {
    id: 4,
    title: 'Selena Gomez',
    image: {
      uri: `https://tamagui.dev/bento/images/wheel-list/wl_4.png`,
    },
    description: '94M Subscribers',
    backgroundColor: '#034C53',
    theme: 'teal',
  },
  {
    id: 5,
    title: 'Dwayne Johnson',
    image: {
      uri: `https://tamagui.dev/bento/images/wheel-list/wl_5.png`,
    },
    backgroundColor: '#C14600',
    description: '8M Subscribers',
    theme: 'orangeRed',
  },
  {
    id: 6,
    title: 'Ariana Grande',
    image: {
      uri: `https://tamagui.dev/bento/images/wheel-list/wl_6.png`,
    },
    description: '22M Subscribers',
    backgroundColor: '#872341',
    theme: 'burgundy',
  },
  {
    id: 7,
    title: 'Hailey Baldwin',
    image: {
      uri: `https://tamagui.dev/bento/images/wheel-list/wl_7.png`,
    },
    backgroundColor: '#261FB3',
    description: '32M Subscribers',
    theme: 'royalBlue',
  },
  {
    id: 8,
    title: 'Justin Bieber',
    image: {
      uri: `https://tamagui.dev/bento/images/wheel-list/wl_8.png`,
    },
    description: '12M Subscribers',
    backgroundColor: '#D84040',
    theme: 'supreme',
  },
]

const SPACING = 40
const ITEM_SIZE = 125

const SIZE_RANGE = ITEM_SIZE + SPACING

const getInputRange = (index: number) => [
  Math.round((index - 3) * SIZE_RANGE),
  Math.round((index - 2) * SIZE_RANGE),
  Math.round((index - 1) * SIZE_RANGE),
  Math.round(index * SIZE_RANGE),
  Math.round((index + 1) * SIZE_RANGE),
  Math.round((index + 2) * SIZE_RANGE),
  Math.round((index + 3) * SIZE_RANGE),
]

WheelList.fileName = 'WheelList'
