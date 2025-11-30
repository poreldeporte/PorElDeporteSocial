import { SIGN_UP_DRAFT_KEY, type SignUpDraftPayload } from './sign-up-draft.shared'

export type { SignUpDraftPayload } from './sign-up-draft.shared'

const getStorage = () => {
  if (typeof window === 'undefined') return null
  return window?.localStorage ?? null
}

export const loadSignUpDraft = async (): Promise<SignUpDraftPayload | null> => {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(SIGN_UP_DRAFT_KEY)
    return raw ? (JSON.parse(raw) as SignUpDraftPayload) : null
  } catch {
    return null
  }
}

export const saveSignUpDraft = async (draft: SignUpDraftPayload) => {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(SIGN_UP_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // swallow write errors (private browsing, etc.)
  }
}

export const clearSignUpDraft = async () => {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(SIGN_UP_DRAFT_KEY)
  } catch {
    //
  }
}
