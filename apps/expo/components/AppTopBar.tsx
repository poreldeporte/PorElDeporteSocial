import type { IconProps } from '@tamagui/helpers-icon'
import { Platform } from 'react-native'
import { SizableText, XStack, YStack, useTheme } from '@my/ui/public'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

import { useChromeTokens } from './chromeTokens'

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
  onPressTitle?: () => void
  titleIcon?: IconComponent
  leftIcon?: IconComponent
  rightIcon?: IconComponent
  rightVariant?: 'light' | 'dark'
  rightActions?: HeaderAction[]
  backgroundColor?: string
}

type ChromeTokens = ReturnType<typeof useChromeTokens>

type CircleButtonProps = {
  icon?: IconComponent
  onPress?: () => void
  variant?: 'light' | 'dark'
  accessibilityLabel?: string
  title?: string
  tokens: ChromeTokens
}

const CircleButton = ({
  icon: Icon,
  onPress,
  variant = 'dark',
  accessibilityLabel,
  title,
  tokens,
}: CircleButtonProps) => {
  if (!Icon) {
    return <YStack w={tokens.buttonSize} h={tokens.buttonSize} />
  }
  const isLight = variant === 'light'
  const bg = isLight ? tokens.primary : tokens.surface
  const iconColor = tokens.textPrimary
  return (
    <YStack
      w={tokens.buttonSize}
      h={tokens.buttonSize}
      br={tokens.buttonSize / 2}
      ai="center"
      jc="center"
      bg={bg}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      title={title}
      pressStyle={{ opacity: 0.86, scale: 0.98 }}
      shadowColor={tokens.shadowColor}
      shadowOpacity={tokens.shadowOpacity}
      shadowRadius={tokens.shadowRadius}
      shadowOffset={tokens.shadowOffset}
      elevation={tokens.elevation}
    >
      <Icon size={20} color={iconColor} />
    </YStack>
  )
}

export const AppTopBar = ({
  title,
  onPressLeft,
  onPressRight,
  onPressTitle,
  titleIcon: TitleIcon,
  leftIcon,
  rightIcon,
  rightVariant = 'dark',
  rightActions,
  backgroundColor,
}: AppTopBarProps) => {
  const insets = useSafeAreaInsets()
  const chromeTokens = useChromeTokens()
  const theme = useTheme()
  const titleColor = theme.color?.val ?? chromeTokens.textPrimary
  const titlePressable = Boolean(onPressTitle)
  return (
    <YStack
      pt={insets.top + chromeTokens.headerPadTop}
      px={chromeTokens.headerPadX}
      pb={chromeTokens.headerPadBottom}
      position="relative"
      bg={backgroundColor ?? '$background'}
    >
      <XStack ai="center" jc="space-between" position="relative">
        <CircleButton icon={leftIcon} onPress={onPressLeft} variant="dark" tokens={chromeTokens} />
        <XStack
          position="absolute"
          left={0}
          right={0}
          jc="center"
          pointerEvents={titlePressable ? 'box-none' : 'none'}
        >
          <YStack
            ai="center"
            onPress={onPressTitle}
            accessibilityRole={titlePressable ? 'button' : undefined}
            accessibilityLabel={titlePressable ? title : undefined}
            pressStyle={titlePressable ? { opacity: 0.86 } : undefined}
            cursor={titlePressable ? 'pointer' : undefined}
            px="$2"
            py="$1"
          >
            <XStack ai="center" gap="$1.5">
              <SizableText size={chromeTokens.headerTitleSize} fontWeight="600" color={titleColor}>
                {title}
              </SizableText>
              {TitleIcon ? (
                <YStack opacity={0.6}>
                  <TitleIcon size={14} color={titleColor} />
                </YStack>
              ) : null}
            </XStack>
          </YStack>
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
                tokens={chromeTokens}
              />
            ))}
          </XStack>
        ) : (
          <CircleButton
            icon={rightIcon}
            onPress={onPressRight}
            variant={rightVariant}
            tokens={chromeTokens}
          />
        )}
      </XStack>
    </YStack>
  )
}
