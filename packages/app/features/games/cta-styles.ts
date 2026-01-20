import { BRAND_COLORS } from 'app/constants/colors'

export const ctaButtonStyles = {
  brandSolid: {
    backgroundColor: BRAND_COLORS.primary,
    borderColor: BRAND_COLORS.primary,
    color: '$background',
  },
  brandOutline: {
    backgroundColor: 'transparent',
    borderColor: BRAND_COLORS.primary,
    color: BRAND_COLORS.primary,
  },
  inkOutline: {
    backgroundColor: '$background',
    borderColor: '$color',
    color: '$color',
  },
  neutralSolid: {
    backgroundColor: '$color',
    borderColor: '$color',
    color: '$background',
  },
} as const
