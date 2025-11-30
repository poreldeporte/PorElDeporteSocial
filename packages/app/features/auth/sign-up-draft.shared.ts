export type SignUpDraftPayload = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  birthDate?: string
  jerseyNumber?: number
  position?: string
}

export const SIGN_UP_DRAFT_KEY = 'ped.sign_up_draft'
