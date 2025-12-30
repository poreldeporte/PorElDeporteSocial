import countries from 'i18n-iso-countries'
import en from 'i18n-iso-countries/langs/en.json'
import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

const splitDigits = (value: string) => value.replace(/\D/g, '')

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
  const digits = splitDigits(value).slice(0, 15)
  if (!digits) return ''
  const formatter = new AsYouType(country)
  return formatter.input(digits)
}

export const parsePhoneToE164 = (value: string, country: CountryCode) => {
  const parsed = parsePhoneNumberFromString(value, country)
  if (!parsed || !parsed.isValid()) return null
  return parsed.number
}

export const formatE164ForDisplay = (value: string) => {
  const parsed = parsePhoneNumberFromString(value)
  if (!parsed) return value
  return parsed.formatInternational()
}

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
