import {
  Avatar,
  Button,
  type ButtonProps,
  Popover,
  Separator,
  SizableText,
  Theme,
  XStack,
  YStack,
  getTokens,
} from '@my/ui/public'
import { ChevronLeft, Plus, ShoppingBag } from '@tamagui/lucide-icons'
import { getScreenLayout, type ScreenLayoutId } from 'app/navigation/layouts'
import { getRoutesById, navRoutes, profileMenuRouteIds, webTabRouteIds } from 'app/navigation/routes'
import { usePathname } from 'app/utils/usePathname'
import { useUser } from 'app/utils/useUser'
import { useState } from 'react'
import { SolitoImage } from 'solito/image'
import { Link } from 'solito/link'

import { NavTabs } from './components/nav-tabs.web'

export type HomeLayoutProps = {
  children?: React.ReactNode
  padded?: boolean
  fullPage?: boolean
  layoutId?: ScreenLayoutId
  backHref?: string
  backLabel?: string
  pageTitle?: string
}

const headerTitleByLayout: Partial<Record<ScreenLayoutId, string>> = {
  tabsRoot: 'Por El Deporte',
  gamesList: 'Schedule',
  gameDetail: 'Game Info',
  gameDraft: 'Draft Room',
  community: 'La Familia',
  profile: 'My Profile',
}

const headerBackByLayout: Partial<
  Record<ScreenLayoutId, string | ((pathname: string) => string | undefined)>
> = {
  gameDetail: '/games',
  gameDraft: (pathname) => pathname.replace(/\/draft\/?$/, '') || '/games',
}

export const HomeLayout = ({
  children,
  fullPage = false,
  padded = false,
  layoutId,
  backHref,
  backLabel,
  pageTitle,
}: HomeLayoutProps) => {
  const defaultLayout = getScreenLayout('tabsRoot')
  const activeLayout = layoutId ? getScreenLayout(layoutId) : defaultLayout
  const derivedTitle = pageTitle ?? activeLayout?.title ?? defaultLayout.title
  const headerTitle = headerTitleByLayout[activeLayout.id] ?? derivedTitle
  const pathname = usePathname()
  const layoutBackConfig = headerBackByLayout[activeLayout.id]
  const layoutBackHref =
    typeof layoutBackConfig === 'function' ? layoutBackConfig(pathname) : layoutBackConfig
  const derivedBackHref = backHref ?? layoutBackHref
  const { role } = useUser()
  const isAdmin = role === 'admin'
  return (
    <YStack f={1} bg="$color1">
      <Header title={headerTitle} backHref={derivedBackHref} layoutId={activeLayout.id} isAdmin={isAdmin} />
      <YStack
        {...(fullPage && { flex: 1 })}
        {...(padded && {
          maw: 800,
          mx: 'auto',
          px: '$2',
          w: '100%',
        })}
        pb={activeLayout.stickyCta === 'primary' ? '$13' : '$8'}
        $gtSm={{ pb: 0 }}
      >
        {children}
      </YStack>
      <BottomNav reserveCtaSpace={activeLayout.stickyCta === 'primary'} />
    </YStack>
  )
}

const UserAvatar = () => {
  const { avatarUrl } = useUser()

  return (
    <Avatar size="$2" circular>
      <SolitoImage
        src={avatarUrl}
        alt="your avatar"
        width={getTokens().size['2'].val}
        height={getTokens().size['2'].val}
      />
    </Avatar>
  )
}

const CtaButton = (props: ButtonProps) => {
  const { role } = useUser()
  const isAdmin = role === 'admin'
  const createRoute = navRoutes.create
  if (!isAdmin) return null
  return (
    <Theme inverse>
      <Link href={createRoute.href}>
        <Button size="$3" space="$1.5" my="$-1" icon={Plus} br="$10" {...props}>
          Create
        </Button>
      </Link>
    </Theme>
  )
}

const ProfileMenu = () => {
  const [open, setOpen] = useState(false)
  const { displayName, user } = useUser()
  const profileRoutes = getRoutesById(profileMenuRouteIds)
  return (
    <Popover size="$3" stayInFrame={{ padding: 16 }} open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button chromeless p="$1">
          <UserAvatar />
        </Button>
      </Popover.Trigger>
      <Popover.Content
        bw={1}
        boc="$borderColor"
        enterStyle={{ y: -10, o: 0 }}
        exitStyle={{ y: -10, o: 0 }}
        w={240}
        p="$3"
        elevate
      >
        <YStack gap="$2">
          <YStack>
            <SizableText fontWeight="600">{displayName || 'Member'}</SizableText>
            <SizableText theme="alt2" size="$2">
              {user?.email ?? ''}
            </SizableText>
          </YStack>
          <Separator />
          {profileRoutes.map((route) => {
            const Icon = route.icon
            return (
              <Link key={route.id} href={route.href}>
                <Button
                  chromeless
                  justifyContent="flex-start"
                  gap="$2"
                  onPress={() => setOpen(false)}
                >
                  <Icon size={18} />
                  {route.label}
                </Button>
              </Link>
            )
          })}
        </YStack>
      </Popover.Content>
    </Popover>
  )
}

const Header = ({
  backHref,
  title,
  layoutId,
  isAdmin,
}: {
  backHref?: string
  title: string
  layoutId: ScreenLayoutId
  isAdmin: boolean
}) => {
  const showBack = Boolean(backHref)
  const showCreate = layoutId === 'gamesList' && isAdmin
  const showProfile = layoutId === 'leaderboard'
  const LeftContent = () => {
    if (showBack) {
      return (
        <Link href={backHref!}>
          <Button
            chromeless
            px={0}
            py={0}
            height="$4"
            width="$4"
            aria-label="Go back"
            pressStyle={{ opacity: 0.7 }}
          >
            <ChevronLeft size={28} />
          </Button>
        </Link>
      )
    }
    if (showCreate) {
      return (
        <Link href={navRoutes.create.href}>
          <Button
            chromeless
            px="$2"
            py="$1"
            gap="$1"
            icon={Plus}
            pressStyle={{ opacity: 0.7 }}
          >
            Create
          </Button>
        </Link>
      )
    }
    if (showProfile) {
      return (
        <Link href="/profile">
          <Button chromeless px={0} py={0} aria-label="Profile" pressStyle={{ opacity: 0.7 }}>
            <UserAvatar />
          </Button>
        </Link>
      )
    }
    return null
  }

  return (
    <YStack
      bw="$0"
      bbc="$borderColor"
      bs="solid"
      bbw="$0.5"
      jc="center"
      px="$3"
      py="$0"
      bg="$color1"
      zi={5}
    >
      <XStack w="100%" pos="relative" jc="center" ai="center">
        <XStack pos="absolute" l="$2">
          <LeftContent />
        </XStack>
        <SizableText fontSize="$5" fontWeight="700">
          {title}
        </SizableText>
        <XStack pos="absolute" r="$2">
          <ShopButton />
        </XStack>
      </XStack>
    </YStack>
  )
}

const ShopButton = () => (
  <Link href="/shop">
    <Button
      chromeless
      px={0}
      py={0}
      height="$4"
      width="$4"
      aria-label="Shop"
      pressStyle={{ opacity: 0.7 }}
    >
      <ShoppingBag size={24} />
    </Button>
  </Link>
)

const BottomNav = ({ reserveCtaSpace = false }: { reserveCtaSpace?: boolean }) => {
  const pathname = usePathname()
  const routes = getRoutesById(webTabRouteIds)
  return (
    <XStack
      $gtSm={{ dsp: 'none' }}
      bg="$color1"
      px="$2"
      pt="$1"
      pb={reserveCtaSpace ? '$6' : '$1'}
      jc="space-around"
      ai="center"
      btw="$0.5"
      btc="$borderColor"
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}
    >
      {routes.map((route) => {
        const Icon = route.icon
        const active =
          pathname === route.href || (route.href !== '/' && pathname.startsWith(`${route.href}/`))
        return (
          <Link key={route.id} href={route.href}>
            <Button
              chromeless
              size="$2"
              bw={0}
              br={0}
              jc="center"
              ai="center"
              gap="$1"
              pressStyle={{ opacity: 0.7 }}
              opacity={active ? 1 : 0.7}
            >
              <Icon size={20} color={active ? '$color12' : '$color10'} />
              <SizableText size="$2">{route.label}</SizableText>
            </Button>
          </Link>
        )
      })}
    </XStack>
  )
}
