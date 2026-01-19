import type { IconProps } from '@tamagui/helpers-icon'
import { Platform } from 'react-native'
import { SizableText, XStack, YStack, useTheme } from '@my/ui/public'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

import { chromeTokens } from './chromeTokens'

type IconComponent = (props: IconProps) => JSX.Element

export type HeaderAction = {
  icon: IconComponent
  onPress?: () => void
  variant?: 'light' | 'dark'
  label?: string
}

type AppTopBarProps = {
  title: string
  onPressLeft?: () => void
  onPressRight?: () => void
  leftIcon?: IconComponent
  rightIcon?: IconComponent
  rightVariant?: 'light' | 'dark'
  rightActions?: HeaderAction[]
}

type CircleButtonProps = {
  icon?: IconComponent
  onPress?: () => void
  variant?: 'light' | 'dark'
  accessibilityLabel?: string
  title?: string
}

const CircleButton = ({
  icon: Icon,
  onPress,
  variant = 'dark',
  accessibilityLabel,
  title,
}: CircleButtonProps) => {
  if (!Icon) {
    return <YStack w={chromeTokens.buttonSize} h={chromeTokens.buttonSize} />
  }
  const isLight = variant === 'light'
  const bg = isLight ? chromeTokens.primary : chromeTokens.surface
  const iconColor = chromeTokens.textPrimary
  return (
    <YStack
      w={chromeTokens.buttonSize}
      h={chromeTokens.buttonSize}
      br={chromeTokens.buttonSize / 2}
      ai="center"
      jc="center"
      bg={bg}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      title={title}
      pressStyle={{ opacity: 0.86, scale: 0.98 }}
      shadowColor={chromeTokens.shadowColor}
      shadowOpacity={chromeTokens.shadowOpacity}
      shadowRadius={chromeTokens.shadowRadius}
      shadowOffset={chromeTokens.shadowOffset}
      elevation={chromeTokens.elevation}
    >
      <Icon size={20} color={iconColor} />
    </YStack>
  )
}

export const AppTopBar = ({
  title,
  onPressLeft,
  onPressRight,
  leftIcon,
  rightIcon,
  rightVariant = 'light',
  rightActions,
}: AppTopBarProps) => {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const titleColor = theme.color?.val ?? chromeTokens.textPrimary
  return (
    <YStack
      pt={insets.top + chromeTokens.headerPadTop}
      px={chromeTokens.headerPadX}
      pb={chromeTokens.headerPadBottom}
      position="relative"
      bg="$background"
    >
      <XStack ai="center" jc="space-between" position="relative">
        <CircleButton icon={leftIcon} onPress={onPressLeft} variant="dark" />
        <XStack position="absolute" left={0} right={0} jc="center" pointerEvents="none">
          <SizableText size={chromeTokens.headerTitleSize} fontWeight="600" color={titleColor}>
            {title}
          </SizableText>
        </XStack>
        {rightActions && rightActions.length > 0 ? (
          <XStack ai="center" gap="$2">
            {rightActions.map((action, index) => (
              <CircleButton
                key={index}
                icon={action.icon}
                onPress={action.onPress}
                variant={action.variant ?? rightVariant}
                accessibilityLabel={action.label}
                title={Platform.OS === 'web' ? action.label : undefined}
              />
            ))}
          </XStack>
        ) : (
          <CircleButton icon={rightIcon} onPress={onPressRight} variant={rightVariant} />
        )}
      </XStack>
    </YStack>
  )
}
