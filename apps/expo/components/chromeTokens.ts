import { useMemo } from 'react'
import { useBrand } from '@my/app/provider/brand'

const baseTokens = {
  appBgStart: '#0c0f14',
  appBgEnd: '#161b24',
  surface: '#1b202a',
  surfaceLight: '#f4f5f7',
  textPrimary: '#f7f8fb',
  textSecondary: '#9aa1ad',
  iconDark: '#11151b',
  radiusLg: 24,
  radiusXl: 32,
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 10,
  buttonSize: 44,
  dockPadding: 8,
  headerPadTop: 2,
  headerPadBottom: 6,
  headerPadX: 18,
  headerTitleSize: '$3',
}

export const useChromeTokens = () => {
  const { primaryColor } = useBrand()
  return useMemo(() => ({ ...baseTokens, primary: primaryColor }), [primaryColor])
}
