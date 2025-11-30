import AsyncStorage from '@react-native-async-storage/async-storage'

import { SIGN_UP_DRAFT_KEY, type SignUpDraftPayload } from './sign-up-draft.shared'

export type { SignUpDraftPayload } from './sign-up-draft.shared'

export const loadSignUpDraft = async (): Promise<SignUpDraftPayload | null> => {
  try {
    const raw = await AsyncStorage.getItem(SIGN_UP_DRAFT_KEY)
    return raw ? (JSON.parse(raw) as SignUpDraftPayload) : null
  } catch {
    return null
  }
}

export const saveSignUpDraft = async (draft: SignUpDraftPayload) => {
  try {
    await AsyncStorage.setItem(SIGN_UP_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    //
  }
}

export const clearSignUpDraft = async () => {
  try {
    await AsyncStorage.removeItem(SIGN_UP_DRAFT_KEY)
  } catch {
    //
  }
}
