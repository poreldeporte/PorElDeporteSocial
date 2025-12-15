import type { IconProps } from '@tamagui/helpers-icon'
import {
  Calendar,
  Home,
  MessageCircle,
  PenSquare,
  Plus,
  Settings as SettingsIcon,
  Trophy,
  User,
} from '@tamagui/lucide-icons'

type LucideIcon = (props: IconProps) => JSX.Element

export type NavigationRoute = {
  id:
    | 'home'
    | 'games'
    | 'community'
    | 'settings'
    | 'profile'
    | 'profileEdit'
    | 'create'
    | 'leaderboard'
  label: string
  href: string
  nativeSegment?: string
  icon: LucideIcon
}

export const navRoutes: Record<NavigationRoute['id'], NavigationRoute> = {
  home: {
    id: 'home',
    label: 'Home',
    href: '/',
    nativeSegment: 'index',
    icon: Home,
  },
  games: {
    id: 'games',
    label: 'Schedule',
    href: '/games',
    nativeSegment: 'games/index',
    icon: Calendar,
  },
  settings: {
    id: 'settings',
    label: 'Account settings',
    href: '/settings',
    nativeSegment: 'settings/index',
    icon: SettingsIcon,
  },
  profile: {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    nativeSegment: 'profile',
    icon: User,
  },
  profileEdit: {
    id: 'profileEdit',
    label: 'Edit profile',
    href: '/profile/edit',
    nativeSegment: 'profile/edit',
    icon: PenSquare,
  },
  leaderboard: {
    id: 'leaderboard',
    label: 'Leaders',
    href: '/leaderboard',
    nativeSegment: 'leaderboard',
    icon: Trophy,
  },
  create: {
    id: 'create',
    label: 'Create',
    href: '/create',
    nativeSegment: 'create',
    icon: Plus,
  },
}

export const webTabRouteIds = ['games', 'home', 'leaderboard'] as const
export const nativeTabRouteIds = ['games', 'home', 'leaderboard'] as const
export const profileMenuRouteIds = ['profile', 'profileEdit', 'settings'] as const

type RouteId = typeof webTabRouteIds[number] | typeof nativeTabRouteIds[number] | typeof profileMenuRouteIds[number]

export const getRoutesById = <T extends RouteId>(ids: readonly T[]) => ids.map((id) => navRoutes[id])
