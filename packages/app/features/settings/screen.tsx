import { Paragraph, ScrollView, Separator, Settings, YStack, isWeb, useMedia } from '@my/ui/public'
import { Book, Cog, Info, LogOut, Moon, Twitter } from '@tamagui/lucide-icons'
import { useThemeSetting } from 'app/provider/theme'
import { useLogout } from 'app/utils/auth/logout'
import { redirect } from 'app/utils/redirect'
import { usePathname } from 'app/utils/usePathname'
import { useLink } from 'solito/link'

import rootPackageJson from '../../../../package.json'
import packageJson from '../../package.json'

export const SettingsScreen = () => {
  const media = useMedia()
  const pathname = usePathname()

  return (
    <YStack f={1}>
      <ScrollView>
        <Settings>
          <Settings.Items>
            <Settings.Group $gtSm={{ space: '$1' }}>
              <Settings.Item
                icon={Cog}
                isActive={pathname === 'settings/general'}
                {...useLink({ href: media.sm ? '/settings/general' : '/settings' })}
                accentTheme="green"
              >
                General
              </Settings.Item>
            </Settings.Group>
            {isWeb && <Separator boc="$color3" mx="$-4" bw="$0.25" />}
            <Settings.Group>
              <Settings.Item
                icon={Book}
                isActive={pathname === '/privacy-policy'}
                {...useLink({ href: '/privacy-policy' })}
                accentTheme="purple"
              >
                Privacy Policy
              </Settings.Item>
              <Settings.Item
                icon={Book}
                isActive={pathname === '/terms-of-service'}
                {...useLink({ href: '/terms-of-service' })}
                accentTheme="purple"
              >
                Terms Of Service
              </Settings.Item>
              {/* removing about from web since landing pages are more common on web - feel free to add back if needed */}
              {!isWeb && (
                // isWeb is a constant so this isn't really a conditional hook
                // eslint-disable-next-line react-hooks/rules-of-hooks
                <Settings.Item icon={Info} {...useLink({ href: '/about' })} accentTheme="blue">
                  About
                </Settings.Item>
              )}
            </Settings.Group>
            {isWeb && <Separator boc="$color3" mx="$-4" bw="$0.25" />}
            <Settings.Group>
              <Settings.Item
                icon={Twitter}
                onPress={() => redirect('https://twitter.com/tamagui_js')}
                accentTheme="blue"
              >
                Our Twitter
              </Settings.Item>
            </Settings.Group>
            {isWeb && <Separator boc="$color3" mx="$-4" bw="$0.25" />}
            <Settings.Group>
              <SettingsThemeAction />
              <SettingsItemLogoutAction />
            </Settings.Group>
          </Settings.Items>
        </Settings>
      </ScrollView>
      {/*
      NOTE: you should probably get the actual native version here using https://www.npmjs.com/package/react-native-version-info
      we just did a simple package.json read since we want to keep things simple for the starter
       */}
      <Paragraph py="$2" ta="center" theme="alt2">
        {rootPackageJson.name} {packageJson.version}
      </Paragraph>
    </YStack>
  )
}

const SettingsThemeAction = () => {
  const { toggle, current } = useThemeSetting()

  return (
    <Settings.Item icon={Moon} accentTheme="blue" onPress={toggle} rightLabel={current}>
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
