const COMMON_DOMAINS = [
  'gmail.com',
  'icloud.com',
  'me.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'live.com',
]

const levenshtein = (a: string, b: string) => {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  return matrix[a.length][b.length]
}

export const getEmailSuggestion = (value: string) => {
  if (!value || !value.includes('@')) return undefined
  const [localPart, domainPart = ''] = value.split('@')
  const domain = domainPart.toLowerCase().trim()
  if (!localPart || !domain) return undefined
  if (COMMON_DOMAINS.includes(domain)) return undefined

  let best: { domain: string; distance: number } | null = null
  for (const candidate of COMMON_DOMAINS) {
    const distance = levenshtein(domain, candidate)
    if (distance <= 2 && (!best || distance < best.distance)) {
      best = { domain: candidate, distance }
    }
  }
  return best ? `${localPart}@${best.domain}` : undefined
}
