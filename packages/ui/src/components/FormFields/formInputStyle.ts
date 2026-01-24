export const formFieldShell = {
  borderWidth: 1,
  borderColor: '$color8',
  borderRadius: 12,
  backgroundColor: '$color2',
} as const

export const formInputStyle = {
  ...formFieldShell,
  px: '$3',
  py: '$3',
  minHeight: 48,
} as const
