export const DOCK = {
  width: '92%',
  maxWidth: 420,
  height: 72,
  radius: 32,
  padding: 8,
  bottomOffset: -5,
} as const

export const DOCK_CHROME = {
  surface: '$color12',
  shadowColor: '$shadowColor',
  shadowOpacity: 0.28,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 10,
} as const

export const getDockBottomOffset = (insetsBottom: number) =>
  insetsBottom + DOCK.bottomOffset

export const getDockSpacer = (insetsBottom: number) =>
  DOCK.height + Math.max(getDockBottomOffset(insetsBottom), 0)
