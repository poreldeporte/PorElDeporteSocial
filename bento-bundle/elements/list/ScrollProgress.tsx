import { ArrowRight, Bookmark, ChevronLeft } from '@tamagui/lucide-icons'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { SafeAreaView, TouchableOpacity } from 'react-native'
import Animated, {
  
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import {
  AnimatePresence,
  getToken,
  isWeb,
  Paragraph,
  styled,
  Text,
  useTheme,
  View,
  XStack,
} from 'tamagui'
import { LinearGradient } from 'tamagui/linear-gradient'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedView = Animated.createAnimatedComponent(View)
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)
const AnimatedText = Animated.createAnimatedComponent(Text)
const AnimatedList = styled(Animated.FlatList, {
  flex: 1,
})

const title = 'Don Quixote'
const subTitle = 'Chapter I'

const ScreenContext = createContext({
  progress: {} as SharedValue<number>,
  bookmarked: false,
  setBookmarked: (_: boolean) => {},
})

const useScreenContext = () => useContext(ScreenContext)

export function ScrollProgress() {
  const progress = useSharedValue(0)
  const [bookmarked, setBookmarked] = useState(false)

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const height = event.contentSize.height - event.layoutMeasurement.height
      const scrollY = event.contentOffset.y
      const value = height > 0 ? scrollY / height : 0

      if (value <= 1) {
        progress.value = value
      }
    },
  })

  const ListHeaderComponent = useCallback(() => {
    return (
      <>
        <View pt="$20" gap="$2" alignItems="center">
          <Text ff="$mono" color="$color8" textAlign="center" fontSize="$4">
            {subTitle}
          </Text>

          <Text
            fontFamily="Times New Roman"
            fontWeight="bold"
            fontSize={24}
            textAlign="center"
          >
            THE FAMOUS GENTLEMAN DON QUIXOTE OF LA MANCHA
          </Text>
        </View>
        <View h={1} w="40%" bg="$color8" my="$6" alignSelf="center" />
      </>
    )
  }, [])

  return (
    <ScreenContext.Provider value={{ progress, bookmarked, setBookmarked }}>
      <View
        f={1}
        pos="relative"
        h={isWeb ? '80vh' : '100%'}
        $gtLg={{ maxHeight: 600 }}
        maxWidth={600}
        w="100%"
        justifyContent="flex-end"
        alignSelf="center"
      >
        <AnimatedList
          onScroll={scrollHandler}
          renderItem={({ item }) => (
            <Text fontSize="$6" fontFamily="Times New Roman" lineHeight={isWeb ? 31 : "$7"}>
              {item}
            </Text>
          )}
          ListHeaderComponent={ListHeaderComponent}
          data={data}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: isWeb ? 100 : getToken('$space.16'),
            paddingHorizontal: isWeb ? 16 : getToken('$space.6'),
            gap: isWeb ? 16 : getToken('$space.4'),
          }}
        />

        <HeaderView />

        <BottomView />
      </View>
    </ScreenContext.Provider>
  )
}

const HeaderView = () => {
  const { progress, bookmarked, setBookmarked } = useScreenContext()
  const { color8 } = useTheme({ name: 'blue' })

  const opacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.05, 0.1], [0, 1]),
  }))

  return (
    <View py="$4" px="$4" pos="absolute" top={-1} left={0} right={0}>
      <SafeAreaView />

      <AnimatedLinearGradient
        colors={['$background', '$background08', '$background0']}
        locations={[0.8, 0.9, 1]}
        pos="absolute"
        inset={0}
        pb={isWeb ? '$12' : '$16'}
        style={opacityStyle}
      />

      <XStack alignItems="center" gap="$4">
        <ChevronLeft
          onPress={() => {
            //
          }}
        />

        <AnimatedView gap="$1" style={opacityStyle} flex={1}>
          <AnimatedText theme="blue" ff="$mono" color="$color8" fontSize="$2">
            {subTitle}
          </AnimatedText>
          <AnimatedText
            fontFamily="Times New Roman"
            numberOfLines={1}
            fontSize="$5"
            fontWeight="bold"
          >
            {title}
          </AnimatedText>
        </AnimatedView>
        <TouchableOpacity onPress={() => setBookmarked(!bookmarked)}>
          <Bookmark
            fill={bookmarked ? color8.val : 'none'}
            color={bookmarked ? color8.val : '$color'}
            onPress={() => setBookmarked(!bookmarked)}
            zIndex={99}
          />
        </TouchableOpacity>
      </XStack>
    </View>
  )
}

const BottomView = () => {
  const [showBookmark, setShowBookmark] = useState(false)

  const scale = useSharedValue(1)

  const { progress, bookmarked } = useContext(ScreenContext)

  const nextAnimated = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withSpring(
          progress.value >= 0.95 || showBookmark ? 0 : 100,
          SPRING_CONFIG
        ),
      },
    ],
  }))

  const currentAnimated = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withSpring(
          progress.value >= 0.95 || showBookmark ? -100 : 0,
          SPRING_CONFIG
        ),
      },
    ],
  }))

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      {
        translateY: withSpring(
          progress.value >= 0.01 || showBookmark ? 0 : 100,
          SPRING_CONFIG
        ),
      },
    ],
    borderRadius: 48,
  }))

  useEffect(() => {
    if (bookmarked) {
      setShowBookmark(true)
      const timeOut = setTimeout(() => {
        setShowBookmark(false)
      }, 1500)

      return () => {
        clearTimeout(timeOut)
      }
    }
  }, [bookmarked])

  return (
    <AnimatedView
      bg="$background"
      p="$2"
      borderWidth={1}
      borderColor="$color5"
      style={animatedStyle}
      overflow="hidden"
      pos="absolute"
      bottom={isWeb ? '$4' : getToken('$space.4') * 2}
      alignSelf="center"
      shadowColor="$color5"
      alignItems="center"
      justifyContent="flex-end"
      themeInverse
    >
      <AnimatedView
        animation="quicker"
        scale={1}
        exitStyle={{
          scale: 1.1,
        }}
        enterStyle={{
          scale: 1.1,
        }}
        flexDirection="row"
        alignItems="center"
        alignSelf="center"
      >
        <View>
          <AnimatedView px="$4" style={currentAnimated}>
            <Text fontWeight="bold" fontSize="$2">
              {title}
            </Text>
            <Text ff="$mono" color="$color11" fontWeight="500" fontSize="$1">
              {subTitle}
            </Text>
          </AnimatedView>
        </View>

        <AnimatedView
          justifyContent="center"
          alignItems="flex-start"
          bg="$background"
          pos="absolute"
          px="$4"
          gap={0}
          inset={0}
          style={nextAnimated}
        >
          <Text fontWeight="bold" fontSize="$2">
            {showBookmark ? 'Bookmarked' : 'Next'}
          </Text>
          <Text ff="$mono" color="$color11" fontWeight="500" fontSize="$1">
            Chapter II
          </Text>
        </AnimatedView>

        <CircleProgress progress={progress} showBookmark={showBookmark} />
      </AnimatedView>
    </AnimatedView>
  )
}

const size = 32
const strokeWidth = 14
const circum = 2 * Math.PI * 32

const SPRING_CONFIG = {
  damping: 18,
  mass: 0.5,
  stiffness: 180,
}

const CircleProgress = ({
  progress,
  showBookmark,
}: { progress: SharedValue<number>; showBookmark: boolean }) => {
  const { color6, color } = useTheme()

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: withSpring((1 - progress.value) * circum, SPRING_CONFIG),
  }))

  const nextAnimated = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(progress.value >= 0.95 ? 1 : 0, SPRING_CONFIG) }],
  }))

  return (
    <View width={size} height={size}>
      <Svg width={size} height={size} viewBox={`-50 -50 100 100`}>
        {/* Background Circle */}
        <AnimatedCircle
          cx="0"
          cy="0"
          r={size}
          stroke={color6.val}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress Circle */}
        <AnimatedCircle
          cx="0"
          cy="0"
          r={size}
          stroke={color.val}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circum}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform="rotate(-90)"
        />
      </Svg>

      <AnimatedView
        width={size}
        height={size}
        justifyContent="center"
        alignItems="center"
        style={nextAnimated}
        borderRadius="$10"
        bg="$green11"
        pos="absolute"
      >
        <ArrowRight color="$background" />
      </AnimatedView>

      <AnimatePresence>
        {showBookmark && (
          <AnimatedView
            width={size}
            height={size}
            justifyContent="center"
            alignItems="center"
            borderRadius="$10"
            bg="$blue8Light"
            pos="absolute"
            animation="quicker"
            enterStyle={{
              scale: 0,
              opacity: 0,
            }}
            exitStyle={{
              scale: 0,
              opacity: 0,
            }}
            scale={1}
          >
            <Bookmark
              justifyContent="center"
              alignItems="center"
              borderRadius="$10"
              pos="absolute"
              color="$color"
              fill={color.val}
            />
          </AnimatedView>
        )}
      </AnimatePresence>
    </View>
  )
}

ScrollProgress.fileName = 'ScrollProgress'

// You add more text here
const text = `In a village of La Mancha, the name of which I have no desire to call to mind, there lived not long since one of those gentlemen that keep a lance in the lance-rack, an old buckler, a lean hack, and a greyhound for coursing. An olla of rather more beef than mutton, a salad on most nights, scraps on Saturdays, lentils on Fridays, and a pigeon or so extra on Sundays, made away with three-quarters of his income. The rest of it went in a doublet of fine cloth and velvet breeches and shoes to match for holidays, while on week-days he made a brave figure in his best homespun. He had in his house a housekeeper past forty, a niece under twenty, and a lad for the field and market-place, who used to saddle the hack as well as handle the bill-hook. The age of this gentleman of ours was bordering on fifty; he was of a hardy habit, spare, gaunt-featured, a very early riser and a great sportsman. They will have it his surname was Quixada or Quesada (for here there is some difference of opinion among the authors who write on the subject), although from reasonable conjectures it seems plain that he was called Quexana. This, however, is of but little importance to our tale; it will be enough not to stray a hair's breadth from the truth in the telling of it.
You must know, then, that the above-named gentleman whenever he was at leisure (which was mostly all the year round) gave himself up to reading books of chivalry with such ardour and avidity that he almost entirely neglected the pursuit of his field-sports, and even the management of his property; and to such a pitch did his eagerness and infatuation go that he sold many an acre of tillageland to buy books of chivalry to read, and brought home as many of them as he could get. But of all there were none he liked so well as those of the famous Feliciano de Silva's composition, for their lucidity of style and complicated conceits were as pearls in his sight, particularly when in his reading he came upon courtships and cartels, where he often found passages like "the reason of the unreason with which my reason is afflicted so weakens my reason that with reason I murmur at your beauty;" or again, "the high heavens, that of your divinity divinely fortify you with the stars, render you deserving of the desert your greatness deserves." Over conceits of this sort the poor gentleman lost his wits, and used to lie awake striving to understand them and worm the meaning out of them; what Aristotle himself could not have made out or extracted had he come to life again for that special purpose. He was not at all easy about the wounds which Don Belianis gave and took, because it seemed to him that, great as were the surgeons who had cured him, he must have had his face and body covered all over with seams and scars. He commended, however, the author's way of ending his book with the promise of that interminable adventure, and many a time was he tempted to take up his pen and finish it properly as is there proposed, which no doubt he would have done, and made a successful piece of work of it too, had not greater and more absorbing thoughts prevented him.`

const data = text.split('\n')
