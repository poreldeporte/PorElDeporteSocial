import { vi } from 'vitest'

import { runLogout } from './logout'

describe('runLogout', () => {
  it('unregisters the push token before signing out and clears caches', async () => {
    const calls: string[] = []
    const signOut = vi.fn(async () => {
      calls.push('signOut')
    })
    const clearCaches = vi.fn(() => {
      calls.push('clearCaches')
    })
    const loadPushToken = vi.fn(async () => {
      calls.push('loadPushToken')
      return 'expo-token'
    })
    const unregisterPushToken = vi.fn(async () => {
      calls.push('unregisterPushToken')
    })
    const clearPushToken = vi.fn(async () => {
      calls.push('clearPushToken')
    })

    await runLogout({
      userId: 'user-1',
      signOut,
      clearCaches,
      loadPushToken,
      unregisterPushToken,
      clearPushToken,
    })

    expect(loadPushToken).toHaveBeenCalledWith('user-1')
    expect(unregisterPushToken).toHaveBeenCalledWith('expo-token')
    expect(clearPushToken).toHaveBeenCalledWith('user-1')
    expect(signOut).toHaveBeenCalled()
    expect(clearCaches).toHaveBeenCalled()
    expect(calls).toEqual([
      'loadPushToken',
      'unregisterPushToken',
      'clearPushToken',
      'signOut',
      'clearCaches',
    ])
  })

  it('clears caches even when unregistering fails', async () => {
    const signOut = vi.fn(async () => {})
    const clearCaches = vi.fn()
    const loadPushToken = vi.fn(async () => 'expo-token')
    const unregisterPushToken = vi.fn(async () => {
      throw new Error('boom')
    })
    const clearPushToken = vi.fn(async () => {})

    await runLogout({
      userId: 'user-1',
      signOut,
      clearCaches,
      loadPushToken,
      unregisterPushToken,
      clearPushToken,
    })

    expect(signOut).toHaveBeenCalled()
    expect(clearCaches).toHaveBeenCalled()
  })

  it('skips push unregister without a user id', async () => {
    const signOut = vi.fn(async () => {})
    const clearCaches = vi.fn()
    const loadPushToken = vi.fn(async () => 'expo-token')
    const unregisterPushToken = vi.fn(async () => {})
    const clearPushToken = vi.fn(async () => {})

    await runLogout({
      signOut,
      clearCaches,
      loadPushToken,
      unregisterPushToken,
      clearPushToken,
    })

    expect(loadPushToken).not.toHaveBeenCalled()
    expect(unregisterPushToken).not.toHaveBeenCalled()
    expect(clearPushToken).not.toHaveBeenCalled()
  })
})
