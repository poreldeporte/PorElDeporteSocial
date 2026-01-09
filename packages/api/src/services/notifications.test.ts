import { buildGameCancelledPayload, formatProfileName } from './notifications'

describe('formatProfileName', () => {
  it('prefers first and last name', () => {
    expect(formatProfileName({ name: 'Alex', first_name: 'A', last_name: 'B' })).toBe('A B')
  })

  it('falls back to first and last name when name is empty', () => {
    expect(formatProfileName({ name: ' ', first_name: 'Alex', last_name: 'Garcia' })).toBe('Alex Garcia')
  })

  it('falls back to Someone when name is missing', () => {
    expect(formatProfileName(null)).toBe('Someone')
  })
})

describe('buildGameCancelledPayload', () => {
  it('builds a cancellation payload for the game', () => {
    expect(buildGameCancelledPayload({ id: 'game-1', name: 'Sunday Match' })).toEqual({
      title: 'Game cancelled: Sunday Match',
      body: 'This game has been cancelled.',
      data: { url: '/games/game-1' },
    })
  })
})
