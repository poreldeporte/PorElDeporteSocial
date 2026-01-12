import type { ReactNode } from 'react'

import { YStack } from '@my/ui/public'
import { DOCK, DOCK_CHROME, getDockBottomOffset } from 'app/constants/dock'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

type FloatingCtaDockProps = {
  children: ReactNode
  transparent?: boolean
}

export const FloatingCtaDock = ({ children, transparent = false }: FloatingCtaDockProps) => {
  const insets = useSafeAreaInsets()
  const backgroundColor = transparent ? 'transparent' : DOCK_CHROME.surface

  return (
    <YStack
      position="absolute"
      left={0}
      right={0}
      bottom={getDockBottomOffset(insets.bottom)}
      ai="center"
      pointerEvents="box-none"
      zi={10}
    >
      <YStack
        w={DOCK.width}
        maw={DOCK.maxWidth}
        h={DOCK.height}
        br={DOCK.radius}
        bg={backgroundColor}
        px={DOCK.padding}
        py={DOCK.padding}
        gap="$1"
        shadowColor={DOCK_CHROME.shadowColor}
        shadowOpacity={DOCK_CHROME.shadowOpacity}
        shadowRadius={DOCK_CHROME.shadowRadius}
        shadowOffset={DOCK_CHROME.shadowOffset}
        elevation={DOCK_CHROME.elevation}
      >
        {children}
      </YStack>
    </YStack>
  )
}
