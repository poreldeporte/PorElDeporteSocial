export type ProfileCompletion = {
  first_name: string | null
  last_name: string | null
  email: string | null
  jersey_number: number | null
  position: string | null
  birth_date: string | null
}

export const PROFILE_COMPLETION_FIELDS =
  'first_name,last_name,email,jersey_number,position,birth_date'

export const isProfileComplete = (profile: ProfileCompletion | null | undefined) => {
  if (!profile) return false
  if (!profile.first_name?.trim()) return false
  if (!profile.last_name?.trim()) return false
  if (!profile.email?.trim()) return false
  if (!profile.jersey_number) return false
  if (!profile.position?.trim()) return false
  if (!profile.birth_date) return false
  return true
}
