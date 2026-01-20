import { Button, Paragraph, XStack, YStack } from '@my/ui/public'
import type { ThemeName } from '@tamagui/core'

import { getGameCtaIcon } from 'app/features/games/cta-icons'

import { ctaButtonStyles } from '../cta-styles'
import type { GameActionBarProps } from './GameActionBar.types'

export const GameActionBar = ({
  view,
  userStateMessage,
  onCta,
  onConfirmAttendance,
  isConfirming,
}: GameActionBarProps) => {
  const isRateCta = view.ctaLabel === 'Rate the game'
  const isCompletedCta = view.ctaLabel === 'Game completed'
  const isJoinCta =
    view.ctaState === 'claim' || view.ctaState === 'join-waitlist' || view.ctaState === 'grab-open-spot'
  const isDropCta = view.ctaState === 'drop'
  const primaryButtonStyle =
    isRateCta || isCompletedCta
      ? ctaButtonStyles.neutralSolid
      : !view.isGamePending && isDropCta
        ? ctaButtonStyles.inkOutline
        : !view.isGamePending && isJoinCta
          ? view.canConfirmAttendance
            ? ctaButtonStyles.brandOutline
            : ctaButtonStyles.brandSolid
          : {}
  const buttonTheme =
    isRateCta || isJoinCta || isDropCta || isCompletedCta
      ? undefined
      : (view.ctaTheme as ThemeName | undefined)
  const confirmStyle = ctaButtonStyles.brandSolid
  const primaryIcon = getGameCtaIcon({
    isPending: view.isGamePending,
    isRate: isRateCta,
    ctaState: isCompletedCta ? undefined : view.ctaState,
  })

  return (
    <YStack backgroundColor="$background" borderTopWidth={1} borderColor="$color4" px="$4" py="$3" gap="$2">
      <XStack gap="$3" flexWrap="wrap">
        <Button
          flex={1}
          size="$4"
          br="$10"
          disabled={view.ctaDisabled}
          onPress={onCta}
          icon={primaryIcon}
          theme={buttonTheme}
          {...primaryButtonStyle}
        >
          {view.ctaLabel}
        </Button>
        {view.canConfirmAttendance ? (
          <Button
            flex={1}
            size="$4"
            br="$10"
            theme={undefined}
            icon={isConfirming ? undefined : getGameCtaIcon({ showConfirm: true })}
            disabled={isConfirming}
            onPress={onConfirmAttendance}
            {...confirmStyle}
          >
            {isConfirming ? 'Confirming…' : 'Confirm spot'}
          </Button>
        ) : null}
      </XStack>
      <Paragraph theme="alt2" size="$2" textAlign="center">
        {userStateMessage}
      </Paragraph>
    </YStack>
  )
}
