import { Button, Paragraph, Spinner, XStack, YStack } from '@my/ui/public'
import type { ThemeName } from '@tamagui/core'

import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

import type { GameActionBarProps } from './GameActionBar.types'

export const GameActionBar = ({
  view,
  userStateMessage,
  onCta,
  onConfirmAttendance,
  isConfirming,
}: GameActionBarProps) => {
  const insets = useSafeAreaInsets()

  return (
    <YStack backgroundColor="$background" borderTopWidth={1} borderColor="$color4" px="$4" py="$3" pb={Math.max(insets.bottom, 12)} gap="$2" position="absolute" bottom={0} left={0} right={0} zi={10}>
      <XStack gap="$3" flexWrap="wrap">
        <Button
          flex={1}
          size="$4"
          br="$10"
          disabled={view.ctaDisabled}
          onPress={onCta}
          iconAfter={view.isGamePending ? <Spinner size="small" /> : undefined}
          theme={view.ctaTheme as ThemeName | undefined}
        >
          {view.ctaLabel}
        </Button>
        {view.canConfirmAttendance ? (
          <Button
            flex={1}
            size="$4"
            br="$10"
            theme="active"
            disabled={isConfirming}
            onPress={onConfirmAttendance}
          >
            {isConfirming ? 'Confirming…' : 'Confirm attendance'}
          </Button>
        ) : null}
      </XStack>
      <Paragraph theme="alt2" size="$2" textAlign="center">
        {userStateMessage}
      </Paragraph>
    </YStack>
  )
}
