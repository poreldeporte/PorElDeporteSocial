import { buildPushMessages, chunkMessages, type PushMessage } from './push'

describe('buildPushMessages', () => {
  it('maps tokens into push messages with payload', () => {
    const payload = { title: 'Title', body: 'Body', data: { url: '/games/123' } }
    const messages = buildPushMessages(['token-1', 'token-2'], payload)

    expect(messages).toEqual([
      { to: 'token-1', title: 'Title', body: 'Body', data: { url: '/games/123' } },
      { to: 'token-2', title: 'Title', body: 'Body', data: { url: '/games/123' } },
    ])
  })
})

describe('chunkMessages', () => {
  it('splits messages into chunks', () => {
    const messages: PushMessage[] = [
      { to: 'a', title: 'T', body: 'B' },
      { to: 'b', title: 'T', body: 'B' },
      { to: 'c', title: 'T', body: 'B' },
    ]

    expect(chunkMessages(messages, 2)).toEqual([[messages[0], messages[1]], [messages[2]]])
  })

  it('returns empty array for empty input', () => {
    expect(chunkMessages([], 2)).toEqual([])
  })
})
