import countries from 'i18n-iso-countries'
import en from 'i18n-iso-countries/langs/en.json'
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

const splitDigits = (value: string) => value.replace(/\D/g, '')
const MAX_E164_DIGITS = 15

export type PhoneCountryOption = {
  code: CountryCode
  callingCode: string
  name: string
  flag: string
}

let cachedCountryOptions: PhoneCountryOption[] | null = null
let localeRegistered = false

const countryFlag = (code: string) => {
  const base = 127397
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(base + char.charCodeAt(0)))
}

const getDisplayNames = () => {
  if (typeof Intl === 'undefined') return null
  return Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null
}

const ensureCountryLocale = () => {
  if (localeRegistered) return
  countries.registerLocale(en)
  localeRegistered = true
}

const getCountryName = (code: CountryCode, displayNames: Intl.DisplayNames | null) => {
  if (displayNames) return displayNames.of(code) ?? code
  ensureCountryLocale()
  return countries.getName(code, 'en') ?? code
}

const getCallingCode = (country: CountryCode) => {
  try {
    return getCountryCallingCode(country)
  } catch {
    return null
  }
}

const formatUsNational = (digits: string) => {
  const local = digits.slice(0, 10)
  if (!local) return ''
  if (local.length <= 3) return local.length === 3 ? `(${local})` : `(${local}`
  if (local.length <= 6) return `(${local.slice(0, 3)})${local.slice(3)}`
  return `(${local.slice(0, 3)})${local.slice(3, 6)}-${local.slice(6)}`
}

const formatUsDisplay = (digits: string) => {
  const national = formatUsNational(digits)
  return national ? `+1${national}` : ''
}

export const normalizePhoneDigits = (value: string, country: CountryCode) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const digits = splitDigits(trimmed)
  if (!digits) return ''
  const startsWithPlus = trimmed.startsWith('+')
  if (country === 'US') {
    const local = digits.startsWith('1') ? digits.slice(1) : digits
    return local.slice(0, 10)
  }
  const callingCode = getCallingCode(country)
  if (!callingCode) return digits.slice(0, MAX_E164_DIGITS)
  const local =
    startsWithPlus && digits.startsWith(callingCode)
      ? digits.slice(callingCode.length)
      : digits
  const maxLocal = Math.max(0, MAX_E164_DIGITS - callingCode.length)
  return local.slice(0, maxLocal)
}

export const getPhoneCountryOptions = () => {
  if (cachedCountryOptions) return cachedCountryOptions
  const displayNames = getDisplayNames()
  cachedCountryOptions = getCountries()
    .map((code) => ({
      code,
      callingCode: getCountryCallingCode(code),
      name: getCountryName(code, displayNames),
      flag: countryFlag(code),
    }))
    .sort((a, b) => {
      if (a.code === 'US') return -1
      if (b.code === 'US') return 1
      return a.name.localeCompare(b.name)
    })
  return cachedCountryOptions
}

export const resetPhoneCountryOptions = () => {
  cachedCountryOptions = null
}

export const formatPhoneInput = (value: string, country: CountryCode) => {
  const digits = normalizePhoneDigits(value, country)
  if (!digits) return ''
  if (country === 'US') return formatUsNational(digits)
  return digits
}

export const parsePhoneToE164 = (value: string, country: CountryCode) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const digits = splitDigits(trimmed)
  if (!digits) return null
  const startsWithPlus = trimmed.startsWith('+')
  if (startsWithPlus) {
    const parsed = parsePhoneNumberFromString(`+${digits}`)
    if (!parsed || !parsed.isValid()) return null
    if (parsed.country === 'US' && parsed.nationalNumber.length !== 10) return null
    return parsed.number
  }
  if (country === 'US') {
    const local = digits.startsWith('1') ? digits.slice(1) : digits
    if (local.length !== 10) return null
    return `+1${local}`
  }
  const parsed = parsePhoneNumberFromString(digits, country)
  if (!parsed || !parsed.isValid()) return null
  return parsed.number
}

export const formatPhoneDisplay = (value?: string | null) => {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const parsed = parsePhoneNumberFromString(trimmed)
  if (parsed && parsed.isValid()) {
    if (parsed.country === 'US') return formatUsDisplay(parsed.nationalNumber)
    return parsed.number
  }
  const digits = splitDigits(trimmed)
  if (!digits) return ''
  if (digits.length === 10) return formatUsDisplay(digits)
  if (digits.length === 11 && digits.startsWith('1')) return formatUsDisplay(digits.slice(1))
  return `+${digits.slice(0, MAX_E164_DIGITS)}`
}

export const formatNationalityDisplay = (value?: string | null) => {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const option = getPhoneCountryOptions().find((country) => country.code === trimmed)
  if (!option) return trimmed
  return `${option.flag} ${option.name}`
}
