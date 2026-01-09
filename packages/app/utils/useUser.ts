import { useQuery } from '@tanstack/react-query'

import { useLogout } from './auth/logout'
import { formatProfileName } from './profileName'
import { formatPhoneDisplay } from './phone'
import { useSessionContext } from './supabase/useSessionContext'
import { useSupabase } from './supabase/useSupabase'

function useProfile() {
  const { session } = useSessionContext()
  const user = session?.user
  const supabase = useSupabase()
  const logout = useLogout()
  const { data, isPending, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error) {
        // no rows - edge case of user being deleted
        if (error.code === 'PGRST116') {
          await logout({ userId: user.id })
          return null
        }
        throw new Error(error.message)
      }
      return data
    },
  })

  return { data, isPending, refetch }
}

export const useUser = () => {
  const { session, isLoading: isLoadingSession } = useSessionContext()
  const user = session?.user
  const { data: profile, refetch, isPending: isLoadingProfile } = useProfile()

  const displayName = (() => {
    const profileName = formatProfileName(profile, null)
    if (profileName) return profileName
    const metaName = typeof user?.user_metadata.full_name === 'string' ? user.user_metadata.full_name : ''
    if (metaName.trim()) return metaName
    if (profile?.email?.trim()) return profile.email
    const profilePhone = formatPhoneDisplay(profile?.phone)
    if (profilePhone) return profilePhone
    const userPhone = formatPhoneDisplay(user?.phone)
    if (userPhone) return userPhone
    return user?.email ?? ''
  })()

  const avatarUrl = (function () {
    if (profile?.avatar_url) return profile.avatar_url
    if (typeof user?.user_metadata.avatar_url === 'string') return user.user_metadata.avatar_url

    const params = new URLSearchParams()
    const name = displayName || user?.email || ''
    params.append('name', name)
    params.append('size', '256') // will be resized again by NextImage/SolitoImage
    return `https://ui-avatars.com/api.jpg?${params.toString()}`
  })()

  const role = profile?.role ?? 'member'
  const isOwner = role === 'owner'
  const isAdmin = role === 'admin' || role === 'owner'

  return {
    session,
    user,
    profile,
    role,
    isOwner,
    isAdmin,
    avatarUrl,
    displayName,
    updateProfile: () => refetch(),
    isLoadingSession,
    isLoadingProfile,
    isLoading: isLoadingSession || isLoadingProfile,
  }
}
