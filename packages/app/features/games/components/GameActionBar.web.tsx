import { Button, Paragraph, XStack, YStack } from '@my/ui/public'
import type { ThemeName } from '@tamagui/core'

import { BRAND_COLORS } from 'app/constants/colors'
import { getGameCtaIcon } from 'app/features/games/cta-icons'
import type { GameActionBarProps } from './GameActionBar.types'

export const GameActionBar = ({
  view,
  userStateMessage,
  onCta,
  onConfirmAttendance,
  isConfirming,
}: GameActionBarProps) => {
  const isRateCta = view.ctaLabel === 'Rate the game'
  const isJoinCta = view.ctaState === 'join'
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
  const primaryIcon = getGameCtaIcon({
    isPending: view.isGamePending,
    isRate: isRateCta,
    ctaState: view.ctaState,
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
          {...rateButtonStyle}
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
