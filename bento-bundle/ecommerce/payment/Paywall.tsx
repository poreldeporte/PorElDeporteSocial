import Animated, {
  CurvedTransition,
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import {
  Button,
  isWeb,
  styled,
  Switch,
  Text,
  useTheme,
  useThemeName,
  View,
  XStack,
} from 'tamagui'
import { LinearGradient } from 'tamagui/linear-gradient'
import {
  Calendar,
  ChartArea,
  ChartLine,
  Handshake,
  HelpCircle,
  Mail,
  Plug,
  Rocket,
  Star,
  User,
  X,
} from '@tamagui/lucide-icons'
import { Dimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useEffect, useState, type FunctionComponent } from 'react'
import { Chip } from '../../elements/chips/components/chipsParts'
import type { IconProps } from '@tamagui/helpers-icon'

const { width } = Dimensions.get('window')

const AnimatedView = Animated.createAnimatedComponent(View)

const AnimatedHStack = Animated.createAnimatedComponent(
  styled(Animated.View, {
    flexDirection: 'row',
    alignItems: 'center',
    gap: '$4',
    // bg: '$background',
  })
)

export function Paywall() {
  const themeName = useThemeName()

  const goToTermsOfService = () => {
    //
  }

  const oRestore = () => {
    //
  }

  return (
    <View flex={1} gap="$4" bg="$color2">
      <LinearGradient colors={['$color0', 'color2']} pos="absolute" inset={0} />

      <ReviewListCarousel />

      <LinearGradient
        colors={['$background0', '$background', '$background']}
        height={'100%'}
        pos="absolute"
        // inset={0}
        left={0}
        right={0}
        bottom={0}
      />

      {/* <View flex={1} /> */}

      {isWeb ? (
        <XStack
          overflow="scroll"
          scrollbarWidth="none"
          justifyContent="flex-start"
          alignItems="flex-end"
          gap={SPACING}
          paddingHorizontal={SPACING}
        >
          {plans.map((plan, index) => (
            <PlanView
              key={plan.id}
              scrollX={0 as unknown as SharedValue<number>}
              plan={plan}
              index={index}
            />
          ))}
        </XStack>
      ) : (
        <PlanList />
      )}

      <XStack gap="$4" jc="center" ai="center" pb={SPACING * 2}>
        <Text onPress={goToTermsOfService} fontSize="$4" color="$color8">
          Terms of Service
        </Text>
        <Text onPress={oRestore} fontSize="$4" color="$color8">
          Restore
        </Text>
      </XStack>
    </View>
  )
}

const PlanList = () => {
  const scrollX = useSharedValue(0)
  const initialX = useSharedValue(0)

  const gesture = Gesture.Pan()
    .onBegin(() => {
      'worklet'
      initialX.value = scrollX.value
    })
    .onUpdate(({ translationX, velocityX }) => {
      'worklet'
      const maxScroll = -(PLAN_ITEM_WIDTH + SPACING) * (plans.length - 1)
      scrollX.value = Math.max(Math.min(initialX.value + translationX, 0), maxScroll)

      const snapToIndex = (index: number) => {
        scrollX.value = withSpring(-SIZE_RANGE * index, {
          velocity: velocityX,
          damping: 20,
          stiffness: 200,
        })
      }

      // Snap immediately on fast swipes
      if (Math.abs(velocityX) > PLAN_ITEM_WIDTH) {
        const currentIndex = Math.round(-scrollX.value / SIZE_RANGE)
        const direction = velocityX > 0 ? -1 : 1
        const targetIndex = Math.max(
          0,
          Math.min(currentIndex + direction, plans.length - 1)
        )
        snapToIndex(targetIndex)
      }
    })
    .onEnd(({ velocityX }) => {
      'worklet'
      // Snap to nearest on slow swipes
      if (Math.abs(velocityX) <= 500) {
        const index = Math.round(-scrollX.value / SIZE_RANGE)
        const boundedIndex = Math.max(0, Math.min(index, plans.length - 1))
        scrollX.value = withSpring(-SIZE_RANGE * boundedIndex, {
          velocity: velocityX,
          damping: 20,
          stiffness: 200,
        })
      }
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scrollX.value }],
  }))

  return (
    <GestureDetector gesture={gesture} touchAction="pan-x">
      <AnimatedHStack
        style={animatedStyle}
        justifyContent="flex-start"
        alignItems="flex-end"
        gap={SPACING}
        paddingHorizontal={SPACING}
      >
        {plans.map((plan, index) => (
          <PlanView key={plan.id} scrollX={scrollX} plan={plan} index={index} />
        ))}
      </AnimatedHStack>
    </GestureDetector>
  )
}

const PlanView = ({
  plan,
  scrollX,
  index,
}: { plan: Plan; scrollX: SharedValue<number>; index: number }) => {
  const [annual, setAnnual] = useState(false)
  const [nextStep, setNextStep] = useState(false)

  const length = plans.length

  const inputRange = Array.from({ length: length }, (_, i) => index + i)
  const outputRange = Array.from({ length: length }, (_, i) => SIZE_RANGE * i)

  const range = Array.from({ length: length }, (_, i) => index + i - 1)

  const style = useAnimatedStyle(() => {
    const position = (scrollX.value / SIZE_RANGE) * -1

    // keep position in the center
    const active = index <= Math.abs(Math.round(position))
    const translateX = active
      ? interpolate(Math.abs(position), inputRange, outputRange, Extrapolation.CLAMP)
      : 0

    const scale = interpolate(
      position,
      [index - 2, index - 1, index, index + 1, index + 2],
      [0.85, 0.9, 1, 0.9, 0.85],
      Extrapolation.CLAMP
    )

    const opacity = interpolate(position, range, [0.8, 1, 0.8], Extrapolation.CLAMP)

    const rotate = interpolate(
      position,
      [index - 2, index - 1, index, index + 1, index + 2],
      [10, -5, 0, 5, -10],
      Extrapolation.CLAMP
    )

    const translateY = interpolate(
      position,
      [index - 2, index - 1, index, index + 1, index + 2],
      [-SPACING * 2, -SPACING * 1.5, 0, -SPACING * 1.5, -SPACING * 2],
      Extrapolation.CLAMP
    )

    return {
      transform: [{ translateX }, { scale }, { translateY }, { rotate: `${rotate}deg` }],
      opacity,
    }
  })

  const { title, description, price, yearPrice, features } = plan

  const PriceGradient = () => {
    return (
      <LinearGradient
        colors={['$background', '$background0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        pos="absolute"
        // inset={0}
        h={12}
        right={0}
        left={0}
        top={0}
      />
    )
  }

  return (
    <AnimatedView
      style={style}
      {...(isWeb
        ? {
            $gtMd: {
              w: 500,
            },

            w: '100%',
          }
        : {
            w: PLAN_ITEM_WIDTH,
          })}
      layout={CurvedTransition.duration(325).reduceMotion(ReduceMotion.System).build()}
      bg="$background"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius="$8"
      shadowColor="$shadowColor"
      shadowOffset={{ width: 0, height: 0 }}
      shadowOpacity={0.15}
      shadowRadius={'$6'}
      h={nextStep ? 'fit' : '100%'}
      flexGrow={1}
    >
      <View overflow="hidden">
        <View
          key="paywall-plan"
          animation="quicker"
          opacity={nextStep ? 0 : 1}
          transform={[{ translateY: nextStep ? 100 : 0 }]}
          gap="$6"
          p="$6"
        >
          <View gap="$2">
            <XStack gap="$2">
              <Text flex={1} fontWeight="bold" fontSize="$8">
                {title}
              </Text>
              <Text fontWeight="500" fontSize="$6">
                {formatCurrency(price)}/
                <Text fontWeight="500" fontSize="$4" color="$color12">
                  month
                </Text>
              </Text>
            </XStack>
            <Text color="$color8" fontSize="$6">
              {description}
            </Text>
          </View>
          <View
            gap="$3.5"
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius="$6"
            // bg="$backgroundPress"
            py="$3.5"
          >
            {features.map(({ name, Icon }, index) => (
              <>
                <XStack px="$3.5" ai="center" gap="$3" key={name}>
                  <Icon color="$color" />
                  <Text>{name}</Text>
                </XStack>
                {index !== features.length - 1 && (
                  <View
                    key={`${name}-${index}`}
                    borderTopWidth={1}
                    borderColor="$borderColor"
                  />
                )}
              </>
            ))}
          </View>
          <Button
            flexDirection="column"
            gap={0}
            space={0}
            themeInverse
            h={'auto'}
            borderRadius="$10"
            onPress={() => setNextStep(true)}
          >
            <Button.Text py="$3.5" fontSize="$5" fontWeight="bold">
              Subscribe
            </Button.Text>
          </Button>
        </View>

        {nextStep && (
          <View pos="absolute" justifyContent="center" inset={0}>
            <View
              key="paywall-checkout"
              animation="quicker"
              opacity={1}
              transform={[{ translateY: 0 }]}
              enterStyle={{ opacity: 0, transform: [{ translateY: -100 }] }}
              exitStyle={{ opacity: 0, transform: [{ translateY: -100 }] }}
              gap="$6"
              theme={annual ? 'green' : 'active'}
              p="$6"
              flex={1}
            >
              <View flex={1} justifyContent="center" gap="$4" py="$4">
                <XStack
                  gap="$4"
                  alignItems="center"
                  alignSelf="center"
                  justifyContent="space-between"
                  key="switch"
                  animation="quicker"
                  rotate={annual ? '-3deg' : '0deg'}
                >
                  <Text
                    fontSize="$5"
                    {...(!annual
                      ? { color: '$color', fontWeight: '600' }
                      : { color: '$black10' })}
                  >
                    Monthly
                  </Text>
                  <Switch
                    checked={annual}
                    onCheckedChange={(checked) => {
                      setAnnual(checked)
                    }}
                    size={'$3'}
                    backgroundColor={annual ? '$color' : '$color8'}
                    jc="center"
                    ai="center"
                    cursor="pointer"
                    borderWidth={2}
                    borderColor={'$colorTransparent'}
                  >
                    {/* switch background */}
                    <Switch.Thumb animation="medium" bg="$colorTransparent">
                      <View
                        shadowOpacity={0.5}
                        shadowRadius="$4"
                        shadowOffset={{
                          width: '$4',
                          height: 0,
                        }}
                        m={'$1'}
                        flex={1}
                        overflow="hidden"
                        br="$10"
                        ai="center"
                        jc="center"
                        animation="200ms"
                        bg={'$color'}
                      />
                    </Switch.Thumb>
                  </Switch>

                  <Text
                    fontSize="$5"
                    {...(annual
                      ? { color: '$color', fontWeight: '600' }
                      : { color: '$black10' })}
                  >
                    Annual
                  </Text>
                </XStack>

                <View py="$2">
                  <View alignItems="center" alignSelf="center" position="relative">
                    <View h={64} jc="center" ai="center" overflow="hidden">
                      <Text
                        key="monthly-price"
                        animation="quicker"
                        textAlign="center"
                        fontSize="$10"
                        fontWeight="bold"
                        px="$2"
                        opacity={annual ? 0 : 1}
                        transform={[{ translateY: annual ? -56 : 0 }]}
                      >
                        {formatCurrency(price)}
                      </Text>

                      <Text
                        key="annual-price"
                        animation="quicker"
                        textAlign="center"
                        fontSize="$10"
                        fontWeight="bold"
                        transform={[{ translateY: !annual ? 56 : 0 }]}
                        opacity={annual ? 1 : 0}
                        position="absolute"
                      >
                        {formatCurrency(yearPrice)}
                      </Text>

                      {PriceGradient()}
                      <View
                        position="absolute"
                        right={0}
                        bottom={0}
                        rotate={'-180deg'}
                        h={12}
                        left={0}
                      >
                        {PriceGradient()}
                      </View>
                    </View>

                    <Text color="$color8" textAlign="center" fontSize="$4">
                      Monthly
                    </Text>

                    {annual && (
                      <Chip
                        size="$3"
                        rounded
                        position="absolute"
                        right={'$-6'}
                        top={'$-2'}
                        rotate={'25deg'}
                        animation="quicker"
                        opacity={1}
                        transform={[{ translateY: 0 }, { translateX: 0 }]}
                        enterStyle={{
                          opacity: 0,
                          transform: [{ translateY: -10 }, { translateX: 10 }],
                        }}
                        exitStyle={{
                          opacity: 0,
                          transform: [{ translateY: -10 }, { translateX: 10 }],
                        }}
                        px="$3"
                      >
                        <Chip.Text fontWeight="600">
                          -{Math.round(((price - yearPrice) / price) * 100)}%
                        </Chip.Text>
                      </Chip>
                    )}
                  </View>
                </View>

                <Text textAlign="center" fontSize="$6">
                  {description}
                </Text>
              </View>

              <Button
                flexDirection="column"
                gap={0}
                space={0}
                themeInverse
                h={'auto'}
                borderRadius="$10"
              >
                <Button.Text py="$3.5" fontSize="$5" fontWeight="bold">
                  Checkout
                </Button.Text>
              </Button>
            </View>
            <Button
              alignSelf="flex-end"
              circular
              bg="$colorTransparent"
              onPress={() => setNextStep(false)}
              position="absolute"
              top={'$4'}
              right={'$4'}
            >
              <Button.Icon>
                <X size={24} />
              </Button.Icon>
            </Button>
          </View>
        )}
      </View>
    </AnimatedView>
  )
}

const DURATION = 90000

const ReviewListCarousel = () => {
  const slideLeft = useSharedValue(0)
  const slideRight = useSharedValue(0)

  const animatedSlideLeft = useAnimatedStyle(() => ({
    transform: [{ translateX: slideLeft.value }],
  }))

  const animatedSlideRight = useAnimatedStyle(() => ({
    transform: [{ translateX: slideRight.value }],
  }))

  useEffect(() => {
    slideLeft.value = withRepeat(
      withTiming(-REVIEW_RANGE, { duration: DURATION, easing: Easing.linear }),
      -1,
      true
    )

    slideRight.value = withRepeat(
      withTiming(REVIEW_RANGE, { duration: DURATION, easing: Easing.linear }),
      -1,
      true
    )
  }, [])

  return (
    <View
      animation="slow"
      opacity={1}
      transform={[{ translateY: 0 }]}
      enterStyle={{
        opacity: 0,
        transform: [{ translateY: 50 }],
      }}
      exitStyle={{
        opacity: 0,
        transform: [{ translateY: 50 }],
      }}
      flex={1}
      rotate="-10deg"
      gap="$4"
      key="review-list"
    >
      <AnimatedHStack style={animatedSlideLeft}>
        {reviewers.map((reviewer) => (
          <RatingView key={reviewer.id} reviewer={reviewer} />
        ))}
      </AnimatedHStack>

      <AnimatedHStack right={REVIEW_RANGE} style={animatedSlideRight}>
        {reviewers.map((reviewer) => (
          <RatingView key={reviewer.id} reviewer={reviewer} />
        ))}
      </AnimatedHStack>

      <AnimatedHStack left={'-10%'} style={animatedSlideLeft}>
        {reviewers.map((reviewer) => (
          <RatingView key={reviewer.id} reviewer={reviewer} />
        ))}
      </AnimatedHStack>
    </View>
  )
}

const RatingView = ({ reviewer }: { reviewer: Reviewer }) => {
  const { color4 } = useTheme()
  return (
    <View
      borderRadius={'$4'}
      gap="$2"
      overflow="hidden"
      w={'70%'}
      maxWidth={REVIEW_WIDTH}
      h={'100%'}
      p="$3.5"
      bg="$color1"
    >
      <XStack ai="center" gap="$md">
        <Text fontSize="$5" fontWeight="bold" numberOfLines={1} flex={1}>
          {reviewer.name}
        </Text>
        <XStack ai="center" gap="$1">
          {Array.from({ length: 5 }).map((_, index) => {
            const active = index < reviewer.rating
            return (
              <Star
                size="$1"
                key={index}
                color="none"
                fill={active ? '#FFCF50' : color4.val}
              />
            )
          })}
        </XStack>
      </XStack>
      <Text>{reviewer.review}</Text>
      <Text>{reviewer.date}</Text>
    </View>
  )
}

type Feature = {
  Icon: FunctionComponent<IconProps>
  name: string
}

type Plan = {
  id: string
  title: string
  price: number
  yearPrice: number
  description: string
  features: Feature[]
}

const plans: Plan[] = [
  {
    id: 'pro',
    title: 'Pro Plan',
    price: 3.99,
    yearPrice: 2.99,
    description: 'Flexibility for less frequent flyers or occasional trips',
    features: [
      {
        Icon: (props) => <Mail {...props} />,
        name: 'Email integration',
      },
      {
        Icon: (props) => <Calendar {...props} />,
        name: 'Event planning',
      },
      {
        Icon: (props) => <HelpCircle {...props} />,
        name: 'Priority support',
      },
    ],
  },
  {
    id: 'premium',
    title: 'Premium Plan',
    price: 7.99,
    yearPrice: 6.29,
    description: 'Best for professionals and small teams who need advanced features',
    features: [
      {
        Icon: (props) => <Rocket {...props} />,
        name: 'Everything in Pro',
      },
      {
        Icon: (props) => <User {...props} />,
        name: 'Team collaboration',
      },
      {
        Icon: (props) => <ChartLine {...props} />,
        name: 'Advanced analytics',
      },
    ],
  },
  {
    id: 'business',
    title: 'Business Plan',
    price: 14.99,
    yearPrice: 10.99,
    description: 'For larger teams and enterprises with advanced needs',
    features: [
      {
        Icon: (props) => <Handshake {...props} />,
        name: 'Dedicated support',
      },
      {
        Icon: (props) => <Plug {...props} />,
        name: 'API access',
      },
      {
        Icon: (props) => <ChartArea {...props} />,
        name: 'Usage reports',
      },
    ],
  },
]

type Reviewer = {
  id: number
  name: string
  rating: number
  review: string
  date: string
}

const reviewers: Reviewer[] = [
  {
    id: 1,
    name: 'John Smith',
    rating: 4,
    review: 'Amazing product that has transformed how I work. Highly recommend!',
    date: '2024-03-15',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    rating: 4,
    review:
      'Very intuitive interface and great features. Would love to see more customization options.',
    date: '2024-03-10',
  },
  {
    id: 3,
    name: 'Michael Williams',
    rating: 5,
    review:
      "Best productivity tool I've used. The premium features are worth every penny.",
    date: '2024-03-05',
  },
  {
    id: 4,
    name: 'Emily Brown',
    rating: 4,
    review: 'Clean design and smooth performance. Really helps keep me organized.',
    date: '2024-02-28',
  },
  {
    id: 5,
    name: 'David Miller',
    rating: 5,
    review:
      'Excellent app that delivers on all its promises. The support team is fantastic too!',
    date: '2024-02-20',
  },
  {
    id: 6,
    name: 'Jessica Davis',
    rating: 4,
    review:
      'Great tool for both personal and professional use. Very satisfied with my subscription.',
    date: '2024-02-15',
  },
  {
    id: 7,
    name: 'James Wilson',
    rating: 5,
    review: 'Game-changing features that have improved my workflow significantly.',
    date: '2024-02-10',
  },
  {
    id: 8,
    name: 'Lisa Anderson',
    rating: 4,
    review: 'Solid performance and regular updates. Really enjoy using this product.',
    date: '2024-02-05',
  },
  {
    id: 9,
    name: 'Robert Taylor',
    rating: 5,
    review:
      'Phenomenal tool that keeps getting better. The premium features are exceptional.',
    date: '2024-01-30',
  },
  {
    id: 10,
    name: 'Jennifer Martinez',
    rating: 4,
    review: 'User-friendly and powerful. Definitely worth upgrading to the pro version.',
    date: '2024-01-25',
  },
]

const formatCurrency = (price: number) => {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

const SPACING = 24
const PLAN_ITEM_WIDTH = width - SPACING * 2
const SIZE_RANGE = PLAN_ITEM_WIDTH + SPACING

const REVIEW_WIDTH = isWeb ? 400 : width * 0.7
const REVIEW_RANGE = REVIEW_WIDTH * (reviewers.length - 2)

Paywall.fileName = 'Paywall'
Paywall.title = 'Paywall #1'
