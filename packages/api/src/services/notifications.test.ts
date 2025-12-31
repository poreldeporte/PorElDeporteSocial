import { formatProfileName } from './notifications'

describe('formatProfileName', () => {
  it('prefers explicit name', () => {
    expect(formatProfileName({ name: 'Alex', first_name: 'A', last_name: 'B' })).toBe('Alex')
  })

  it('falls back to first and last name', () => {
    expect(formatProfileName({ name: ' ', first_name: 'Alex', last_name: 'Garcia' })).toBe('Alex Garcia')
  })

  it('falls back to Someone when name is missing', () => {
    expect(formatProfileName(null)).toBe('Someone')
  })
})
