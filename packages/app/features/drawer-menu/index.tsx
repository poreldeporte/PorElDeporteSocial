import { Avatar, Paragraph, Settings, XStack, YStack, getTokens, useWindowDimensions } from '@my/ui/public'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import { Box, Cog, Milestone, ShoppingCart, User, Users } from '@tamagui/lucide-icons'
import { SCREEN_CONTENT_PADDING } from 'app/constants/layout'
import { formatProfileName } from 'app/utils/profileName'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { useUser } from 'app/utils/useUser'
import { SolitoImage } from 'solito/image'
import { useLink } from 'solito/link'

export function DrawerMenu(props) {
  const { profile, avatarUrl } = useUser()
  const name = formatProfileName(profile, 'No Name') ?? 'No Name'
  const insets = useSafeAreaInsets()
  const height = useWindowDimensions().height

  return (
    <DrawerContentScrollView {...props} f={1}>
      <YStack
        maw={600}
        mx="auto"
        w="100%"
        f={1}
        h={height - insets.bottom - insets.top}
        py="$4"
        pb="$2"
      >
        <Settings>
          <Settings.Items mx={SCREEN_CONTENT_PADDING.horizontal} m="$0">
            <Settings.Group>
              <Settings.Item icon={User} {...useLink({ href: '/profile/edit' })} accentTheme="pink">
                Edit profile
              </Settings.Item>
              <Settings.Item icon={Box} accentTheme="green">
                My Items
              </Settings.Item>
              <Settings.Item icon={Users} accentTheme="orange">
                Refer Your Friends
              </Settings.Item>
              <Settings.Item icon={Milestone} accentTheme="gray">
                Address Info
              </Settings.Item>
              <Settings.Item icon={ShoppingCart} accentTheme="blue">
                Purchase History
              </Settings.Item>
              <Settings.Item {...useLink({ href: '/settings' })} icon={Cog}>
                Settings
              </Settings.Item>
            </Settings.Group>
          </Settings.Items>
        </Settings>

        <XStack gap="$4" mb="$7" mt="auto" ai="center" px={SCREEN_CONTENT_PADDING.horizontal}>
          <Avatar circular size="$3">
            <SolitoImage
              src={avatarUrl}
              alt="your avatar"
              width={getTokens().size['3'].val}
              height={getTokens().size['3'].val}
            />
          </Avatar>
          <Paragraph ta="center" ml="$-1.5">
            {name ?? 'No Name'}
          </Paragraph>
        </XStack>
      </YStack>
    </DrawerContentScrollView>
  )
}
