type ProfileName = {
  first_name?: string | null
  last_name?: string | null
  name?: string | null
}

export const formatProfileName = (
  profile: ProfileName | null | undefined,
  fallback: string | null = null
) => {
  const first = profile?.first_name?.trim()
  const last = profile?.last_name?.trim()
  const composed = [first, last].filter(Boolean).join(' ').trim()
  if (composed) return composed
  const named = profile?.name?.trim()
  if (named) return named
  return fallback
}
