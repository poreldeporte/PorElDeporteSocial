import type { ThemeName } from '@tamagui/core'

import { Button, XStack, submitButtonBaseProps } from '@my/ui/public'
import { FloatingCtaDock } from 'app/components/FloatingCtaDock'
import { getGameCtaIcon } from 'app/features/games/cta-icons'

import { ctaButtonStyles } from '../cta-styles'
import type { GameActionBarProps } from './GameActionBar.types'

export const GameActionBar = ({
  view,
  onCta,
  onConfirmAttendance,
  isConfirming,
}: GameActionBarProps) => {
  const isRateCta = view.ctaLabel === 'Rate the game'
  const isCompletedCta = view.ctaLabel === 'Game completed'
  const isDropCta = view.ctaState === 'drop'
  const isJoinCta =
    view.ctaState === 'claim' || view.ctaState === 'join-waitlist' || view.ctaState === 'grab-open-spot'
  const primaryButtonStyle =
    isRateCta || isCompletedCta
      ? ctaButtonStyles.neutralSolid
      : !view.isGamePending && isDropCta
        ? ctaButtonStyles.inkOutline
        : !view.isGamePending && isJoinCta
          ? ctaButtonStyles.brandSolid
          : {}
  const buttonTheme =
    isRateCta || isJoinCta || isDropCta || isCompletedCta
      ? undefined
      : (view.ctaTheme as ThemeName | undefined)
  const confirmStyle = ctaButtonStyles.brandSolid
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
  const buttonStyle = showConfirmOnly ? confirmStyle : primaryButtonStyle

  return (
    <FloatingCtaDock transparent>
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
