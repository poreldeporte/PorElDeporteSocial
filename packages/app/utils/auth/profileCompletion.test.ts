import { isProfileComplete } from './profileCompletion'

const completeProfile = {
  first_name: 'Jules',
  last_name: 'Winnfield',
  email: 'jules@example.com',
  jersey_number: 8,
  position: 'Defender',
  birth_date: '1980-06-12',
}

describe('isProfileComplete', () => {
  it('returns true for a complete profile', () => {
    expect(isProfileComplete(completeProfile)).toBe(true)
  })

  it('returns false when required fields are missing', () => {
    expect(isProfileComplete({ ...completeProfile, first_name: '' })).toBe(false)
    expect(isProfileComplete({ ...completeProfile, last_name: null })).toBe(false)
    expect(isProfileComplete({ ...completeProfile, email: ' ' })).toBe(false)
    expect(isProfileComplete({ ...completeProfile, jersey_number: null })).toBe(false)
    expect(isProfileComplete({ ...completeProfile, position: '' })).toBe(false)
    expect(isProfileComplete({ ...completeProfile, birth_date: null })).toBe(false)
  })
})
