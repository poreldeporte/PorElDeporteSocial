import {
  formatE164ForDisplay,
  formatPhoneInput,
  getPhoneCountryOptions,
  parsePhoneToE164,
  resetPhoneCountryOptions,
} from './phone'

describe('phone utils', () => {
  it('formats US numbers as you type', () => {
    expect(formatPhoneInput('3055551212', 'US')).toBe('(305) 555-1212')
  })

  it('parses E.164 for a valid US number', () => {
    expect(parsePhoneToE164('(305) 555-1212', 'US')).toBe('+13055551212')
  })

  it('formats E.164 for display', () => {
    expect(formatE164ForDisplay('+13055551212')).toBe('+1 305 555 1212')
  })

  it('includes US in the country list', () => {
    const options = getPhoneCountryOptions()
    const us = options.find((option) => option.code === 'US')
    expect(us?.callingCode).toBe('1')
  })

  it('falls back to ISO country names when Intl.DisplayNames is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'DisplayNames')
    if (!descriptor?.configurable) return
    Object.defineProperty(Intl, 'DisplayNames', { value: undefined, configurable: true })
    resetPhoneCountryOptions()
    const options = getPhoneCountryOptions()
    const us = options.find((option) => option.code === 'US')
    expect(us?.name).toBeTruthy()
    expect(us?.name).not.toBe('US')
    Object.defineProperty(Intl, 'DisplayNames', descriptor)
    resetPhoneCountryOptions()
  })
})
