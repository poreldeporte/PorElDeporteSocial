import AsyncStorage from '@react-native-async-storage/async-storage'

const PUSH_TOKEN_PREFIX = '@push_token:'

const pushTokenKey = (userId: string) => `${PUSH_TOKEN_PREFIX}${userId}`

export const loadPushToken = async (userId: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(pushTokenKey(userId))
  } catch {
    return null
  }
}

export const storePushToken = async (userId: string, token: string) => {
  try {
    await AsyncStorage.setItem(pushTokenKey(userId), token)
  } catch {
    //
  }
}

export const clearPushToken = async (userId: string) => {
  try {
    await AsyncStorage.removeItem(pushTokenKey(userId))
  } catch {
    //
  }
}
