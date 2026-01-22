import { StyleSheet, type ScrollViewProps } from 'react-native'
import { type ReactNode } from 'react'

import { Paragraph, ScrollView, Separator, Settings, SizableText, Switch, XStack, YStack, isWeb } from '@my/ui/public'
import { BrandStamp } from 'app/components/BrandStamp'
import { SCREEN_CONTENT_PADDING } from 'app/constants/layout'
import { Book, CheckCircle2, Cog, Info, LogOut, Moon, Instagram, ShoppingBag, User, Users } from '@tamagui/lucide-icons'
import { useBrand } from 'app/provider/brand'
import { useThemeSetting } from 'app/provider/theme'
import { useLogout } from 'app/utils/auth/logout'
import { redirect } from 'app/utils/redirect'
import { usePathname } from 'app/utils/usePathname'
import { useUser } from 'app/utils/useUser'
import { useLink } from 'solito/link'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const SettingsScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const pathname = usePathname()
  const { isAdmin } = useUser()
  const aboutLink = useLink({ href: '/about' })
  const shopLink = useLink({ href: '/shop' })
  const privacyLink = useLink({ href: '/privacy-policy' })
  const termsLink = useLink({ href: '/terms-of-service' })
  const accountLink = useLink({ href: '/settings/account' })
  const communityLink = useLink({ href: '/settings/community' })
  const approvalsLink = useLink({ href: '/admin/approvals' })
  const groupsLink = useLink({ href: '/settings/groups' })
  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const baseContentStyle = headerSpacer
    ? {
        paddingTop: 0,
        paddingHorizontal: SCREEN_CONTENT_PADDING.horizontal,
        paddingBottom: SCREEN_CONTENT_PADDING.bottom,
      }
    : {
        paddingTop: SCREEN_CONTENT_PADDING.top,
        paddingHorizontal: SCREEN_CONTENT_PADDING.horizontal,
        paddingBottom: SCREEN_CONTENT_PADDING.bottom,
      }
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle].filter(Boolean)
      : [baseContentStyle, contentContainerStyle].filter(Boolean)
  )

  return (
    <YStack f={1}>
      <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
        {headerSpacer}
        <Settings>
          <Settings.Items mx="$0" m="$0">
            {isAdmin ? (
              <Settings.Group>
                <Settings.Item
                  icon={Cog}
                  isActive={pathname === '/settings/community'}
                  {...communityLink}
                  accentTheme="orange"
                >
                  Community settings
                </Settings.Item>
                <Settings.Item icon={CheckCircle2} {...approvalsLink} accentTheme="orange">
                  Member approvals
                </Settings.Item>
                <Settings.Item icon={Users} {...groupsLink} accentTheme="orange">
                  Manage groups
                </Settings.Item>
              </Settings.Group>
            ) : null}
            {isWeb && isAdmin ? (
              <Separator boc="$color12" mx={-SCREEN_CONTENT_PADDING.horizontal} bw="$0.25" />
            ) : null}
            <Settings.Group $gtSm={{ space: '$1' }}>
              <Settings.Item icon={Info} {...aboutLink} accentTheme="blue">
                About
              </Settings.Item>
              <Settings.Item
                icon={Instagram}
                onPress={() => redirect('https://www.instagram.com/poreldeporte')}
                accentTheme="blue"
              >
                Our Instagram
              </Settings.Item>
              <Settings.Item icon={ShoppingBag} {...shopLink} accentTheme="green">
                Shop
              </Settings.Item>
              <SettingsThemeAction />
            </Settings.Group>
            {isWeb && (
              <Separator boc="$color12" mx={-SCREEN_CONTENT_PADDING.horizontal} bw="$0.25" />
            )}
            <Settings.Group>
              <Settings.Item
                icon={Book}
                isActive={pathname === '/privacy-policy'}
                {...privacyLink}
                accentTheme="purple"
              >
                Privacy Policy
              </Settings.Item>
              <Settings.Item
                icon={Book}
                isActive={pathname === '/terms-of-service'}
                {...termsLink}
                accentTheme="purple"
              >
                Terms Of Service
              </Settings.Item>
            </Settings.Group>
            {isWeb && (
              <Separator boc="$color12" mx={-SCREEN_CONTENT_PADDING.horizontal} bw="$0.25" />
            )}
            <Settings.Group>
              <Settings.Item
                icon={User}
                isActive={pathname === '/settings/account'}
                {...accountLink}
                accentTheme="blue"
              >
                Account Management
              </Settings.Item>
              <SettingsItemLogoutAction />
            </Settings.Group>
          </Settings.Items>
        </Settings>
        <BrandStamp />
      </ScrollView>
    </YStack>
  )
}

const SettingsThemeAction = () => {
  const { set, current } = useThemeSetting()
  const { primaryColor } = useBrand()
  const checked = current === 'dark'

  return (
    <Settings.Item
      icon={Moon}
      accentTheme="blue"
      rightElement={
        <XStack ai="center" gap="$2" pr="$2">
          <XStack ai="center" br="$10" boc="$color6" bw={1} overflow="hidden">
            <XStack
              px="$2"
              py="$1"
              bg={checked ? 'transparent' : '$color12'}
              onPress={() => set('light')}
            >
              <SizableText
                size="$1"
                tt="uppercase"
                letterSpacing={1}
                color={checked ? '$color10' : '$background'}
              >
                Light
              </SizableText>
            </XStack>
            <XStack
              px="$2"
              py="$1"
              bg={checked ? '$color12' : 'transparent'}
              onPress={() => set('dark')}
            >
              <SizableText
                size="$1"
                tt="uppercase"
                letterSpacing={1}
                color={checked ? '$background' : '$color10'}
              >
                Dark
              </SizableText>
            </XStack>
          </XStack>
          <Switch
            native
            size="$2"
            checked={checked}
            onCheckedChange={(next) => set(next ? 'dark' : 'light')}
            backgroundColor={checked ? primaryColor : '$color5'}
            borderColor={checked ? primaryColor : '$color6'}
            borderWidth={1}
          >
            <Switch.Thumb animation="100ms" />
          </Switch>
        </XStack>
      }
    >
      Theme
    </Settings.Item>
  )
}

const SettingsItemLogoutAction = () => {
  const logout = useLogout()

  return (
    <Settings.Item icon={LogOut} accentTheme="red" onPress={() => logout()}>
      Log Out
    </Settings.Item>
  )
}
