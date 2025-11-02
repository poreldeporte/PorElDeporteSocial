import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { useRef, useState } from 'react'
import { ScrollView as RNScrollView } from 'react-native'
import {
  Circle,
  ScrollView,
  ScrollViewProps,
  Theme,
  ThemeName,
  XStack,
  YStack,
  useWindowDimensions,
} from 'tamagui'

import { OnboardingProps } from './Onboarding'
import { OnboardingControls } from './OnboardingControls'

export const Onboarding = ({ onOnboarded, steps }: OnboardingProps) => {
  const dimensions = useWindowDimensions()
  const safeAreaInsets = useSafeAreaInsets()

  const [stepIdx, _setStepIdx] = useState(0)
  // prevent a background to ever "continue" animation / try to continue where it left off - cause looks weird

  const [key, setKey] = useState(0)
  const currentStep = steps[stepIdx]!
  const stepsCount = steps.length

  const setStepIdx = (newIdx: number) => {
    if (stepIdx !== newIdx) {
      _setStepIdx(newIdx)
      setKey(key + 1)
    }
  }

  const handleScroll: ScrollViewProps['onScroll'] = (event) => {
    const val = event.nativeEvent.contentOffset.x / dimensions.width
    const newIdx = Math.round(val)
    if (stepIdx !== newIdx) {
      setStepIdx(newIdx)
    }
  }

  const changePage = (newStepIdx: number) => {
    scrollRef.current?.scrollTo({ x: newStepIdx * dimensions.width, animated: true })
  }

  const scrollRef = useRef<RNScrollView>(null)

  return (
    <Theme name={currentStep.theme as ThemeName}>
      <YStack
        f={1}
        bg="$color3"
        ov="hidden"
        pb={safeAreaInsets.bottom}
        pr={safeAreaInsets.right}
        pt={safeAreaInsets.top}
        pl={safeAreaInsets.left}
      >
        <Background />

        <YStack f={1}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
          >
            {steps.map((step, idx) => {
              const isActive = idx === stepIdx
              return (
                <YStack
                  key={idx}
                  w={dimensions.width - (safeAreaInsets.left + safeAreaInsets.right)}
                >
                  {isActive && <step.Content key={idx} />}
                </YStack>
              )
            })}
          </ScrollView>
          <XStack gap={10} jc="center" my="$4">
            {Array.from(Array(stepsCount)).map((_, idx) => {
              const isActive = idx === stepIdx
              return <Point key={idx} active={isActive} onPress={() => setStepIdx(idx)} />
            })}
          </XStack>
        </YStack>
        <OnboardingControls
          currentIdx={stepIdx}
          onChange={(val) => changePage(val)}
          stepsCount={stepsCount}
          onFinish={onOnboarded}
        />
      </YStack>
    </Theme>
  )
}

const Point = ({ active, onPress }: { active: boolean; onPress: () => void }) => {
  return (
    <YStack
      br="$10"
      w={active ? 30 : 10}
      h={10}
      onPress={onPress}
      bg={active ? '$color7' : '$color6'}
    />
  )
}

export const Background = () => {
  const { height } = useWindowDimensions()
  return (
    <YStack fullscreen jc="center" ai="center">
      <Circle
        animation="lazy"
        x={0}
        y={0}
        o={1}
        scale={1}
        bg="$color3"
        enterStyle={{
          scale: 0,
        }}
        exitStyle={{
          scale: 10,
          o: 0,
        }}
        w={height * 3}
        h={height * 3}
      />
    </YStack>
  )
}
