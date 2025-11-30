import { Platform } from 'react-native'

let linkingModule: typeof import('expo-linking') | null = null

const getLinking = () => {
  if (!linkingModule) {
    linkingModule = require('expo-linking')
  }
  return linkingModule
}

const fallbackWebUrl = process.env.NEXT_PUBLIC_URL ?? process.env.EXPO_PUBLIC_URL ?? ''
const defaultScheme = process.env.EXPO_PUBLIC_SCHEME || 'poreldeporte'

export const getOAuthRedirectUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  if (Platform.OS === 'web') {
    return fallbackWebUrl
  }

  const { createURL } = getLinking()
  return createURL('/auth/callback', { scheme: defaultScheme })
}
