import { Button, Paragraph, Spinner, XStack, YStack } from '@my/ui/public'
import type { ThemeName } from '@tamagui/core'
import { Lock, Star, ThumbsDown } from '@tamagui/lucide-icons'

import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { BRAND_COLORS } from 'app/constants/colors'

import type { GameActionBarProps } from './GameActionBar.types'

export const GameActionBar = ({
  view,
  userStateMessage,
  onCta,
  onConfirmAttendance,
  isConfirming,
}: GameActionBarProps) => {
  const insets = useSafeAreaInsets()
  const primaryButtonStyle =
    view.ctaState === 'join'
      ? { backgroundColor: BRAND_COLORS.primary, borderColor: BRAND_COLORS.primary }
      : {}
  const confirmStyle = { backgroundColor: BRAND_COLORS.primary, borderColor: BRAND_COLORS.primary }
  const primaryIcon =
    view.isGamePending
      ? <Spinner size="small" />
      : view.canConfirmAttendance
        ? <Lock size={16} />
        : view.ctaLabel === 'Claim spot'
          ? <Star size={16} />
          : view.ctaLabel === 'Drop out'
            ? <ThumbsDown size={16} />
            : undefined

  return (
    <YStack backgroundColor="$background" borderTopWidth={1} borderColor="$color4" px="$4" py="$3" pb={Math.max(insets.bottom, 12)} gap="$2" position="absolute" bottom={0} left={0} right={0} zi={10}>
      <XStack gap="$3" flexWrap="wrap">
        <Button
          flex={1}
          size="$4"
          br="$10"
          disabled={view.ctaDisabled}
          onPress={onCta}
          icon={primaryIcon}
          theme={view.ctaTheme as ThemeName | undefined}
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
            icon={isConfirming ? undefined : <Lock size={16} />}
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
