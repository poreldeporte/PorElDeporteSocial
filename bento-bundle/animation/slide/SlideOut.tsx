import { useEffect, useState } from 'react'
import { AnimatePresence, Button, Image, Text, Theme, View, XStack } from 'tamagui'
import { DirectionSlide } from './DirectionSlide'

const axises = {
  left: {
    axis: 'x',
    value: -100,
  },
  right: {
    axis: 'x',
    value: 100,
  },
  top: {
    axis: 'y',
    value: -100,
  },
  bottom: { axis: 'y', value: 100 },
  none: { axis: 'y', value: 0 },
}

function SlideOut({
  direction,
}: {
  direction: 'left' | 'right' | 'top' | 'bottom' | 'none'
}) {
  const axis = axises[direction]

  const [show, setShow] = useState(true)

  useEffect(() => {
    if (direction !== 'none') {
      let secondTimeout: NodeJS.Timeout
      const timeout = setTimeout(() => {
        setShow(false)
        secondTimeout = setTimeout(() => {
          setShow(true)
        }, 1000)
      }, 500)
      return () => {
        clearTimeout(timeout)
        clearTimeout(secondTimeout)
      }
    }
  }, [direction])

  return (
    <AnimatePresence>
      {show && (
        <View
          gap="$2"
          tag="article"
          role="banner"
          shadowColor="$shadowColor"
          shadowOffset={{
            width: 0,
            height: -6,
          }}
          shadowRadius={'$5'}
          shadowOpacity={0.1}
          animation={{
            opacity: {
              type: 'bouncy',
              overshootClamping: true,
            },
          }}
          borderRadius="$8"
          overflow="hidden"
          exitStyle={{ opacity: 0, [axis.axis]: axis.value }}
          borderWidth={2}
          borderColor="$color4"
        >
          <View width={312} gap="$6">
            <View p="$3.5" position="relative">
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontWeight="500" fontSize="$3" fontFamily="$mono" color="$color10">
                  Tamagui Debit
                </Text>

                <Image src="/avatar_pro.png" width={32} height={32} />
              </XStack>

              <Text
                pt="$4"
                fontWeight="600"
                fontSize="$8"
                fontFamily="$mono"
                color="$color"
              >
                ···· ···· ···· 0225
              </Text>
            </View>

            <XStack backgroundColor="$background" p="$3.5" themeInverse>
              <Text
                flex={1}
                fontWeight="500"
                fontSize="$2"
                fontFamily="$mono"
                color="$color11"
              >
                Nate Wienert
              </Text>
              <Text
                textAlign="right"
                fontWeight="500"
                fontSize="$2"
                fontFamily="$mono"
                color="$color12"
              >
                03/26
              </Text>
            </XStack>
          </View>
        </View>
      )}
    </AnimatePresence>
  )
}

/** ------ EXAMPLE ------ */
export function SlideOutDemo() {
  const [direction, setDirection] = useState<'left' | 'right' | 'top' | 'bottom'>('left')
  return (
    <View maxWidth="100%" gap="$6">
      <SlideOut key={direction} direction={direction} />
      <DirectionSlide direction={direction} setDirection={setDirection} />
    </View>
  )
}

SlideOutDemo.fileName = 'SlideOut'
