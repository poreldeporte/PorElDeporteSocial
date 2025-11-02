import { memo, useEffect, useState } from 'react'
import { type FlatListProps, SafeAreaView } from 'react-native'
import Animated, {
  
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated'
import {
  Button,
  getTokenValue,
  Image,
  Text,
  View,
  XStack,
  YStack,
  type TextProps,
} from 'tamagui'
import { FlatList, Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Share } from '@tamagui/lucide-icons'

const blogs = [
  {
    id: 1,
    title: 'The most insightful stories about JavaScript',
    image: 'https://tamagui.dev/bento/images/avatar_1.png',
    minutesToRead: 5,
  },
  {
    id: 2,
    title: 'Catch all the highlights',
    image: 'https://tamagui.dev/bento/images/avatar_1.png',
    minutesToRead: 10,
  },
]

// @ts-ignore react 19 has issue with type here
const AnimatedFlatList = Animated.createAnimatedComponent<FlatListProps<Blog>>(FlatList)

const AnimatedView = Animated.createAnimatedComponent(View)

type Blog = (typeof blogs)[number]

export const ProfileView = () => {
  const [followed, setFollowed] = useState(false)

  const scrollY = useSharedValue(0)

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y
  })

  const renderItem = ({ item, index }: { item: Blog; index: number }) => {
    return (
      <XStack gap="$4" px="$6" py="$4">
        <Image borderRadius="$8" w={78} h={78} source={{ uri: item.image }} />
        <YStack f={1} gap="$2">
          <Text fontSize="$6" fontWeight="600" color="$color12">
            {item.title}
          </Text>
          <Text ff="$mono" fontSize="$4" fontWeight="400" color="$color10">
            {item.minutesToRead} minutes
          </Text>
        </YStack>
      </XStack>
    )
  }

  return (
    <YStack w="100%" h="100%" $gtMd={{ maxWidth: 400 }} bg="$color6">
      <SafeAreaView />
      <YStack
        key="fake-stack"
        borderTopLeftRadius="$10"
        borderTopRightRadius="$10"
        w="100%"
        h={56}
        mb={-32}
        bg="$color4"
      />

      <YStack overflow="hidden" borderRadius="$10" w="100%" h="100%" bg="$color2" f={1}>
        <AnimatedFlatList
          onScroll={scrollHandler}
          ListHeaderComponent={() => (
            <YStack w="100%" p="$6" gap="$4">
              <AvatarView followed={followed} />

              <YStack pt="$2">
                <Text fontWeight="900" ff="$mono" fontSize="$10">
                  John Doe
                </Text>
                <Text color="$color10" fontSize="$5" ff="$silkscreen">
                  @john_doe
                </Text>
              </YStack>

              <HashText lineHeight="$5" fontSize="$5" color="$color10">
                🚀 Built my first full-stack app from scratch, learned TypeScript, and
                dove deep into React Native #CodeLife #DevJourney
              </HashText>

              <Follower followed={followed} />

              <ButtonGroup followed={followed} setFollowed={setFollowed} />
            </YStack>
          )}
          data={blogs}
          renderItem={renderItem}
          keyExtractor={(item: Blog) => item.title}
          scrollEventThrottle={16}
        />

        <Header scrollY={scrollY} />
      </YStack>
    </YStack>
  )
}

const ButtonGroup = ({
  followed,
  setFollowed,
}: { followed: boolean; setFollowed: (followed: boolean) => void }) => {
  return (
    <XStack pt="$4" gap="$4">
      <Button
        themeInverse={!followed}
        theme={followed ? 'accent' : 'red'}
        animation="200ms"
        fontWeight="bold"
        fontSize="$6"
        flex={1}
        h="$6"
        borderRadius="$10"
        color="$color12"
        onPress={() => setFollowed(!followed)}
      >
        {followed ? (
          <Text
            key={'Following'}
            animatePresence
            enterStyle={{
              opacity: 0,
              y: 10,
            }}
            exitStyle={{
              opacity: 0,
              y: 10,
            }}
            opacity={1}
            animation="bouncy"
            fontFamily="$mono"
            fontWeight="bold"
            fontSize="$5"
          >
            Following
          </Text>
        ) : (
          <Text
            key={'Follow'}
            animatePresence
            fontFamily="$mono"
            fontWeight="bold"
            fontSize="$5"
            enterStyle={{
              opacity: 0,
              y: -10,
            }}
            exitStyle={{
              opacity: 0,
              y: -10,
            }}
            opacity={1}
            animation="bouncy"
          >
            Follow
          </Text>
        )}
      </Button>

      <Button theme="active" h="$6" w="$6" borderRadius="$10">
        <Share />
      </Button>
    </XStack>
  )
}

const AvatarView = memo(
  ({ followed }: { followed: boolean }) => {
    const rotation = useSharedValue(0)

    const gesture = Gesture.Pan()
      .onUpdate((event) => {
        rotation.value = event.translationX / 100
      })
      .onEnd(() => {
        rotation.value = withSpring(0)
      })

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { perspective: 1000 },
          { rotateY: `${rotation.value * 180}deg` },
          {
            rotate: '3deg',
          },
        ],
      }
    })

    useEffect(() => {
      rotation.value = withSpring(followed ? 2 : -2, {
        damping: 50,
        stiffness: 100,
        overshootClamping: true,
      })
    }, [followed])

    return (
      <GestureDetector gesture={gesture}>
        <View
          w="fit"
          shadowColor="$color6"
          shadowOffset={{ width: 0, height: '$-3' }}
          shadowOpacity={1}
          shadowRadius="$4"
        >
          <AnimatedView
            key={'avatar'}
            w="$12"
            h="$12"
            br="$8"
            overflow="hidden"
            bg="$color1"
            borderWidth={3}
            borderColor="$color1"
            $theme-dark={{
              borderColor: '$color',
            }}
            style={animatedStyle}
          >
            <Image
              key="avatar"
              position="absolute"
              backfaceVisibility="hidden"
              h="100%"
              w="100%"
              animatePresence
              source={{ uri: 'https://tamagui.dev/bento/images/avatar_1.png' }}
            />
          </AnimatedView>
        </View>
      </GestureDetector>
    )
  },
  (prevProps, nextProps) => prevProps.followed === nextProps.followed
)

const followerData = [
  {
    avatar: 'https://tamagui.dev/bento/images/avatar_2.png',
  },
  {
    avatar: 'https://tamagui.dev/bento/images/avatar_3.png',
  },
]

const Follower = ({ followed }: { followed: boolean }) => {
  const [follower, setFollower] = useState(99)

  useEffect(() => {
    setFollower((prev) => (followed ? prev + 1 : prev))
  }, [followed])

  return (
    <XStack ai="center" gap="$2">
      {followerData.map((follower, index) => (
        <Image
          borderRadius={'$10'}
          key={follower.avatar}
          w={'$4'}
          h={'$4'}
          marginLeft={index !== 0 ? -(getTokenValue('$5') ?? 20) * 1.5 : undefined}
          source={{ uri: follower.avatar }}
        />
      ))}
      <YStack gap="$1">
        <Text
          animatePresence
          animation="quick"
          ff="$silkscreen"
          fontSize="$8"
          fontWeight="bold"
          color="$color12"
        >
          {follower}
        </Text>
        <Text ff="$mono" fontSize="$4" fontWeight="500" color="$color12">
          Followers
        </Text>
      </YStack>
    </XStack>
  )
}

const Header = ({ scrollY }: { scrollY: SharedValue<number> }) => {
  const header = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [100, 164], [0, 1]),
    }
  })

  return (
    <AnimatedView
      position="absolute"
      bg="$color1"
      top={0}
      left={0}
      right={0}
      style={header}
      p="$4"
      ai="center"
      jc="center"
      shadowColor="$color5"
      shadowOffset={{ width: 0, height: 0 }}
      shadowOpacity={1}
      shadowRadius="$8"
    >
      <XStack gap="$2" ai="center">
        <Image
          w={24}
          aspectRatio={1}
          borderRadius={'$2'}
          source={{ uri: 'https://tamagui.dev/bento/images/avatar_1.png' }}
        />
        <Text ff="$mono" fontSize="$4" fontWeight="600" color="$color12">
          John Doe
        </Text>
      </XStack>
    </AnimatedView>
  )
}

const HashText = ({ children, ...props }: { children: string } & TextProps) => {
  const { mainText, hashtags } = splitTextAndHashtags(children)

  return (
    <Text {...props}>
      {mainText}
      {hashtags.map((hashtag) => (
        <Text ff="$mono" fontWeight="600" key={hashtag}>
          {' '}
          {hashtag}
        </Text>
      ))}
    </Text>
  )
}
const splitTextAndHashtags = (text: string) => {
  // Split text into words
  const words = text.split(' ')

  // Separate hashtags and regular text
  const hashtags: string[] = []
  const regularWords: string[] = []

  words.forEach((word) => {
    if (word.startsWith('#')) {
      hashtags.push(word)
    } else {
      regularWords.push(word)
    }
  })

  return {
    mainText: regularWords.join(' '),
    hashtags: hashtags,
  }
}
