import { useMemo } from 'react'
import { useBrand } from 'app/provider/brand'

export const getCtaButtonStyles = (primaryColor: string) =>
  ({
    brandSolid: {
      backgroundColor: primaryColor,
      borderColor: primaryColor,
      color: '$background',
    },
    brandOutline: {
      backgroundColor: 'transparent',
      borderColor: primaryColor,
      color: primaryColor,
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
  }) as const

export const useCtaButtonStyles = () => {
  const { primaryColor } = useBrand()
  return useMemo(() => getCtaButtonStyles(primaryColor), [primaryColor])
}
