import { defaultConfig } from '@tamagui/config/v4'
import { shorthands } from '@tamagui/shorthands'
import { createTokens, createTamagui, setupDev } from 'tamagui'

import { animations } from './config/animations'
import { bodyFont, headingFont } from './config/fonts'
import { media, mediaQueryDefaultActive } from './config/media'
import { themes as themesIn } from './themes/theme-generated'
import { color } from './themes/token-colors'
import { radius } from './themes/token-radius'
import { size } from './themes/token-size'
import { space } from './themes/token-space'
import { zIndex } from './themes/token-z-index'

if (process.env.NODE_ENV !== 'production') {
  // Hold down Option for a second to see helpful visuals
  setupDev({ visualizer: true })
}

const themes = themesIn

export const config = createTamagui({
  ...defaultConfig,
  themes,
  defaultFont: 'body',
  animations,
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  mediaQueryDefaultActive,
  selectionStyles: (theme) => ({
    backgroundColor: theme.color5,
    color: theme.color11,
  }),
  onlyAllowShorthands: false,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  tokens: createTokens({
    color,
    radius,
    zIndex,
    space,
    size,
  }),
  media,
  settings: {
    allowedStyleValues: 'somewhat-strict',
    autocompleteSpecificTokens: 'except-special',
    fastSchemeChange: false,
  },
})

export default config
