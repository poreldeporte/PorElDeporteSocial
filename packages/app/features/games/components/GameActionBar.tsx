import { Platform } from 'react-native'

import type { GameActionBarProps } from './GameActionBar.types'
import { GameActionBar as NativeBar } from './GameActionBar.native'
import { GameActionBar as WebBar } from './GameActionBar.web'

export const GameActionBar = (props: GameActionBarProps) => {
  if (Platform.OS === 'web') {
    return <WebBar {...props} />
  }
  return <NativeBar {...props} />
}
