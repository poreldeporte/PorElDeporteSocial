import type { ThemeName } from '@tamagui/core'

import { Button, XStack, submitButtonBaseProps } from '@my/ui/public'
import { BRAND_COLORS } from 'app/constants/colors'
import { FloatingCtaDock } from 'app/components/FloatingCtaDock'
import { getGameCtaIcon } from 'app/features/games/cta-icons'

import type { GameActionBarProps } from './GameActionBar.types'

export const GameActionBar = ({
  view,
  onCta,
  onConfirmAttendance,
  isConfirming,
}: GameActionBarProps) => {
  const isRateCta = view.ctaLabel === 'Rate the game'
  const isCompletedCta = view.ctaLabel === 'Game completed'
  const isJoinCta =
    view.ctaState === 'claim' || view.ctaState === 'join-waitlist' || view.ctaState === 'grab-open-spot'
  const primaryButtonStyle =
    !view.isGamePending && !isRateCta && isJoinCta
      ? {
          backgroundColor: 'transparent',
          borderColor: BRAND_COLORS.primary,
          color: BRAND_COLORS.primary,
        }
      : {}
  const rateButtonStyle = isRateCta
    ? { backgroundColor: '$color', borderColor: '$color', color: '$background' }
    : {}
  const buttonTheme =
    isRateCta || isJoinCta ? undefined : (view.ctaTheme as ThemeName | undefined)
  const confirmStyle = { backgroundColor: BRAND_COLORS.primary, borderColor: BRAND_COLORS.primary }
  const showConfirmOnly = view.canConfirmAttendance
  const primaryIcon = getGameCtaIcon({
    isPending: view.isGamePending,
    showConfirm: showConfirmOnly,
    isRate: isRateCta,
    ctaState: isCompletedCta ? undefined : view.ctaState,
  })
  const label = showConfirmOnly
    ? isConfirming ? 'Confirming…' : 'Confirm spot'
    : view.ctaLabel
  const onPress = showConfirmOnly ? onConfirmAttendance : onCta
  const disabled = showConfirmOnly ? isConfirming : view.ctaDisabled
  const icon = showConfirmOnly && isConfirming ? undefined : primaryIcon
  const theme = showConfirmOnly ? undefined : buttonTheme
  const buttonStyle = showConfirmOnly
    ? confirmStyle
    : { ...primaryButtonStyle, ...rateButtonStyle }

  return (
    <FloatingCtaDock>
      <XStack>
        <Button
          {...submitButtonBaseProps}
          flex={1}
          disabled={disabled}
          onPress={onPress}
          icon={icon}
          theme={theme}
          {...buttonStyle}
        >
          {label}
        </Button>
      </XStack>
    </FloatingCtaDock>
  )
}
