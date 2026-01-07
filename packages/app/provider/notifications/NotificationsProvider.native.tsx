import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { Platform } from 'react-native'

import { api } from 'app/utils/api'
import { isProfileApproved } from 'app/utils/auth/profileApproval'
import { storePushToken } from 'app/utils/notifications/pushToken'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'

const PROMPT_KEY_PREFIX = '@push_prompted:'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

const promptKey = (userId: string) => `${PROMPT_KEY_PREFIX}${userId}`

const getProjectId = () => {
  if (Constants.easConfig?.projectId) return Constants.easConfig.projectId
  const extra = Constants.expoConfig?.extra
  if (extra && typeof extra === 'object' && 'eas' in extra) {
    const eas = (extra as { eas?: { projectId?: string } }).eas
    if (eas?.projectId) return eas.projectId
  }
  return undefined
}

const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
  })
}

const ensurePermission = async (userId: string) => {
  const permissions = await Notifications.getPermissionsAsync()
  if (permissions.status === 'granted') return true
  const prompted = await AsyncStorage.getItem(promptKey(userId))
  if (prompted) return false
  const requested = await Notifications.requestPermissionsAsync()
  await AsyncStorage.setItem(promptKey(userId), '1')
  return requested.status === 'granted'
}

const getExpoToken = async () => {
  if (!Device.isDevice) return null
  const projectId = getProjectId()
  const response = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync()
  return response.data ?? null
}

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useUser()
  const supabase = useSupabase()
  const registerDevice = api.notifications.registerDevice.useMutation()
  const isApproved = isProfileApproved(profile)

  useEffect(() => {
    ensureAndroidChannel()
  }, [])

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return
      const url = response.notification.request.content.data?.url
      if (typeof url === 'string' && url.startsWith('/')) {
        router.push(url)
      }
    }

    Notifications.getLastNotificationResponseAsync().then(handleResponse)
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse)

    return () => {
      subscription.remove()
    }
  }, [])

  useEffect(() => {
    if (!user?.id || !isApproved) return
    let active = true

    const register = async () => {
      if (!Device.isDevice) return
      const allowed = await ensurePermission(user.id)
      if (!allowed || !active) return
      const token = await getExpoToken()
      if (!token || !active) return
      await storePushToken(user.id, token)
      const platform = Platform.OS === 'ios' ? 'ios' : 'android'
      const appVersion = Constants.expoConfig?.version ?? null
      const payload = {
        user_id: user.id,
        expo_push_token: token,
        platform,
        app_version: appVersion,
        last_seen_at: new Date().toISOString(),
        disabled_at: null,
      }
      try {
        await registerDevice.mutateAsync({ expoPushToken: token, platform, appVersion })
      } catch {
        const { error } = await supabase
          .from('user_devices')
          .upsert(payload, { onConflict: 'expo_push_token' })
        if (error) return
      }
    }

    register()

    return () => {
      active = false
    }
  }, [user?.id, isApproved, registerDevice, supabase])

  return children
}
