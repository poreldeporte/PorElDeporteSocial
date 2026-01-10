import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewProps } from 'react-native'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { IconProps } from '@tamagui/helpers-icon'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { SCREEN_CONTENT_PADDING } from '@my/app/constants/layout'
import { YStack } from '@my/ui/public'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

import { AppTopBar, type HeaderAction } from './AppTopBar'
import { chromeTokens } from './chromeTokens'

type IconComponent = (props: IconProps) => JSX.Element

type FloatingHeaderRenderProps = {
  scrollProps: ScrollViewProps
  HeaderSpacer: JSX.Element
  topInset: number
}

type FloatingHeaderLayoutProps = {
  title: string
  onPressLeft?: () => void
  onPressRight?: () => void
  leftIcon?: IconComponent
  rightIcon?: IconComponent
  rightVariant?: 'light' | 'dark'
  rightActions?: HeaderAction[]
  children: (props: FloatingHeaderRenderProps) => JSX.Element
}

const ANIMATION_DURATION = 180
const SCROLL_THRESHOLD = 8

export const FloatingHeaderLayout = ({
  title,
  onPressLeft,
  onPressRight,
  leftIcon,
  rightIcon,
  rightVariant = 'light',
  rightActions,
  children,
}: FloatingHeaderLayoutProps) => {
  const insets = useSafeAreaInsets()
  const headerHeight =
    insets.top + chromeTokens.buttonSize + chromeTokens.headerPadTop + chromeTokens.headerPadBottom
  const baseTop = SCREEN_CONTENT_PADDING.top
  const expandedSpacer = headerHeight + baseTop
  const collapsedSpacer = insets.top + baseTop

  const translateY = useSharedValue(0)
  const spacerHeight = useSharedValue(expandedSpacer)
  const lastScrollY = useRef(0)
  const isHidden = useRef(false)

  const setHidden = useCallback(
    (nextHidden: boolean) => {
      if (isHidden.current === nextHidden) return
      isHidden.current = nextHidden
      translateY.value = withTiming(nextHidden ? -headerHeight : 0, {
        duration: ANIMATION_DURATION,
      })
      spacerHeight.value = withTiming(nextHidden ? collapsedSpacer : expandedSpacer, {
        duration: ANIMATION_DURATION,
      })
    },
    [collapsedSpacer, expandedSpacer, headerHeight, spacerHeight, translateY]
  )

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y
      const delta = y - lastScrollY.current
      lastScrollY.current = y

      if (y <= 0) {
        setHidden(false)
        return
      }

      if (Math.abs(delta) < SCROLL_THRESHOLD) return
      setHidden(delta > 0)
    },
    [setHidden]
  )

  useEffect(() => {
    const nextHidden = isHidden.current
    translateY.value = nextHidden ? -headerHeight : 0
    spacerHeight.value = nextHidden ? collapsedSpacer : expandedSpacer
  }, [collapsedSpacer, expandedSpacer, headerHeight, spacerHeight, translateY])

  const headerStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    transform: [{ translateY: translateY.value }],
  }))

  const spacerStyle = useAnimatedStyle(() => ({
    height: spacerHeight.value,
  }))

  const scrollProps = useMemo<ScrollViewProps>(
    () => ({
      onScroll,
      scrollEventThrottle: 16,
    }),
    [onScroll]
  )

  return (
    <YStack f={1} position="relative" bg="$background">
      <Animated.View style={headerStyle}>
        <AppTopBar
          title={title}
          leftIcon={leftIcon}
          onPressLeft={onPressLeft}
          rightIcon={rightIcon}
          onPressRight={onPressRight}
          rightVariant={rightVariant}
          rightActions={rightActions}
        />
      </Animated.View>
      {children({
        scrollProps,
        HeaderSpacer: <Animated.View pointerEvents="none" style={spacerStyle} />,
        topInset: expandedSpacer,
      })}
    </YStack>
  )
}
