import { FullscreenSpinner, Separator, XStack, YStack } from '@my/ui'
import { useUser } from 'app/utils/useUser'

import { SettingsScreen } from './screen'

export type SettingsLayoutProps = {
  /**
   * web-only
   */
  isSettingsHome?: boolean
  /**
   * web-only
   */
  children?: React.ReactNode
}

export const SettingsLayout = ({ children, isSettingsHome = false }: SettingsLayoutProps) => {
  const { isPending, user } = useUser()
  if (isPending || !user) {
    return <FullscreenSpinner />
  }

  return (
    <XStack separator={<Separator vertical />} f={1}>
      <YStack
        bg="$color1"
        $sm={{ f: 1, dsp: isSettingsHome ? 'flex' : 'none' }}
        // this file is web-only so we can safely use CSS
        style={{
          transition: '200ms ease width',
        }}
        $gtSm={{
          w: 300,
        }}
        $gtLg={{
          w: 400,
        }}
      >
        <SettingsScreen />
      </YStack>
      <YStack my="$10" f={1} ai="center" $sm={{ dsp: isSettingsHome ? 'none' : 'block' }}>
        <YStack w="100%">{children}</YStack>
      </YStack>
    </XStack>
  )
}
