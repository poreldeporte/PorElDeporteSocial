import { describe, expect, it } from 'vitest'

import {
  formatBirthDateParts,
  isValidBirthDateParts,
  parseBirthDateParts,
} from './birthDate'

describe('birthDate utils', () => {
  it('parses a stored birth date into parts', () => {
    expect(parseBirthDateParts('1990-02-05')).toEqual({ year: '1990', month: '02', day: '05' })
  })

  it('returns undefined for invalid stored birth dates', () => {
    expect(parseBirthDateParts('1990-13-05')).toBeUndefined()
  })

  it('formats parts into a storage string', () => {
    expect(formatBirthDateParts({ year: '1990', month: '2', day: '5' })).toBe('1990-02-05')
  })

  it('rejects invalid day values', () => {
    expect(isValidBirthDateParts({ year: '2023', month: '2', day: '30' })).toBe(false)
  })

  it('rejects dates after today', () => {
    const today = new Date()
    const future = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    const parts = {
      year: `${future.getFullYear()}`,
      month: `${future.getMonth() + 1}`.padStart(2, '0'),
      day: `${future.getDate()}`.padStart(2, '0'),
    }
    expect(isValidBirthDateParts(parts)).toBe(false)
  })
})
