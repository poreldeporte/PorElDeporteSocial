import type { ReactNode } from 'react'

import { YStack } from '@my/ui/public'
import { DOCK, DOCK_CHROME, getDockBottomOffset } from 'app/constants/dock'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

type FloatingCtaDockProps = {
  children: ReactNode
}

export const FloatingCtaDock = ({ children }: FloatingCtaDockProps) => {
  const insets = useSafeAreaInsets()

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
        bg={DOCK_CHROME.surface}
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
