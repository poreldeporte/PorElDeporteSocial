const splitDigits = (value: string) => value.replace(/\D/g, '')

export const formatPhoneNumber = (value: string) => {
  const digits = splitDigits(value)
  if (!digits) return ''
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const localDigits = digits.slice(-10)
  const countryDigits = digits.slice(0, Math.max(0, digits.length - 10))
  const prefix = countryDigits ? `+${countryDigits}` : '+1'
  return `${prefix} (${localDigits.slice(0, 3)}) ${localDigits.slice(3, 6)}-${localDigits.slice(6)}`
}
