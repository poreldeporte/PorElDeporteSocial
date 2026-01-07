import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useEffect, useMemo, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

import { SizableText, XStack, YStack } from '@my/ui/public'
import { navRoutes } from '@my/app/navigation/routes'
import { DOCK, DOCK_CHROME, getDockBottomOffset } from '@my/app/constants/dock'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

import { chromeTokens } from '../components/chromeTokens'

const dockHeight = DOCK.height
const iconSize = 20
const dockPadding = DOCK.padding
const dockRadius = DOCK.radius
const pillHeight = dockHeight - dockPadding * 2
const activeItemPaddingX = dockPadding * 2.5
const activePillExtraWidth = dockPadding * 1.5

const navRoutesBySegment = Object.values(navRoutes).reduce(
  (acc, route) => {
    const key = route.nativeSegment ?? route.id
    acc[key] = route
    return acc
  },
  {} as Record<string, (typeof navRoutes)[keyof typeof navRoutes]>
)

export const BottomDockTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets()
  const [dockWidth, setDockWidth] = useState(0)
  const [itemWidths, setItemWidths] = useState<Record<string, number>>({})
  const translateX = useSharedValue(0)
  const pillWidth = useSharedValue(0)

  const visibleRoutes = useMemo(
    () => state.routes.filter((route) => navRoutesBySegment[route.name]),
    [state.routes]
  )

  const activeKey = state.routes[state.index]?.key
  const activeWidth = activeKey ? itemWidths[activeKey] : undefined
  const activeIndex = Math.max(
    0,
    visibleRoutes.findIndex((route) => route.key === activeKey)
  )
  const contentWidth = Math.max(0, dockWidth - dockPadding * 2)
  const slotWidth = contentWidth && visibleRoutes.length ? contentWidth / visibleRoutes.length : 0

  useEffect(() => {
    if (!dockWidth || visibleRoutes.length === 0) return
    const nextContentWidth = Math.max(0, dockWidth - dockPadding * 2)
    const nextSlotWidth = nextContentWidth / visibleRoutes.length
    const maxPillWidth = Math.max(0, nextSlotWidth - dockPadding / 2)
    const desiredWidth = activeWidth ? activeWidth + activePillExtraWidth : 0
    const nextPillWidth = activeWidth
      ? Math.min(desiredWidth, maxPillWidth || desiredWidth)
      : maxPillWidth
    const nextX =
      dockPadding + activeIndex * nextSlotWidth + (nextSlotWidth - nextPillWidth) / 2
    translateX.value = withSpring(nextX, { damping: 18, stiffness: 180, mass: 0.7 })
    pillWidth.value = withSpring(nextPillWidth, { damping: 18, stiffness: 180, mass: 0.7 })
  }, [activeIndex, activeWidth, dockWidth, pillWidth, translateX, visibleRoutes.length])

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: pillWidth.value,
  }))

  const handleLayout = (event: LayoutChangeEvent) => {
    setDockWidth(event.nativeEvent.layout.width)
  }
  const handleItemLayout = (key: string) => (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout
    setItemWidths((prev) => (prev[key] === width ? prev : { ...prev, [key]: width }))
  }

  return (
    <YStack
      position="absolute"
      left={0}
      right={0}
      bottom={getDockBottomOffset(insets.bottom)}
      ai="center"
      pointerEvents="box-none"
    >
      <XStack
        w={DOCK.width}
        maw={DOCK.maxWidth}
        h={dockHeight}
        br={dockRadius}
        bg={DOCK_CHROME.surface}
        px={dockPadding}
        py={dockPadding}
        ai="center"
        position="relative"
        shadowColor={DOCK_CHROME.shadowColor}
        shadowOpacity={DOCK_CHROME.shadowOpacity}
        shadowRadius={DOCK_CHROME.shadowRadius}
        shadowOffset={DOCK_CHROME.shadowOffset}
        elevation={DOCK_CHROME.elevation}
        onLayout={handleLayout}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              top: dockPadding,
              height: pillHeight,
              backgroundColor: DOCK_CHROME.surfaceLight,
              borderRadius: dockRadius,
            },
            pillStyle,
          ]}
        />
        {visibleRoutes.map((route) => {
          const isFocused = route.key === activeKey
          const navRoute = navRoutesBySegment[route.name]
          const label =
            navRoute?.label ?? descriptors[route.key]?.options?.title ?? route.name
          const Icon = navRoute?.icon
          const iconColor = isFocused ? chromeTokens.iconDark : chromeTokens.textSecondary
          const labelColor = chromeTokens.iconDark

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            })
          }

          return (
            <XStack
              key={route.key}
              f={1}
              ai="center"
              jc="center"
              onPress={onPress}
              onLongPress={onLongPress}
              pressStyle={{ opacity: 0.86, scale: 0.98 }}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={descriptors[route.key]?.options?.tabBarAccessibilityLabel}
              testID={descriptors[route.key]?.options?.tabBarTestID}
            >
              <XStack
                ai="center"
                jc="center"
                gap="$2"
                px={activeItemPaddingX}
                onLayout={handleItemLayout(route.key)}
              >
                {Icon ? <Icon size={iconSize} color={iconColor} /> : null}
                {isFocused ? (
                  <SizableText size="$3" fontWeight="600" color={labelColor}>
                    {label}
                  </SizableText>
                ) : null}
              </XStack>
            </XStack>
          )
        })}
      </XStack>
    </YStack>
  )
}
