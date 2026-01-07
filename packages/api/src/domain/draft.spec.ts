import { describe, expect, it, vi } from 'vitest'

import { nextSnakeTurn, shuffleOrder, undoPayload } from './draft'

describe('nextSnakeTurn', () => {
  it('advances forward until the last team then reverses', () => {
    expect(nextSnakeTurn(0, 1, 2)).toEqual({ nextTurn: 1, nextDirection: 1 })
    expect(nextSnakeTurn(1, 1, 2)).toEqual({ nextTurn: 1, nextDirection: -1 })
    expect(nextSnakeTurn(1, -1, 2)).toEqual({ nextTurn: 0, nextDirection: -1 })
  })

  it('handles zero or negative team counts by staying at 0', () => {
    expect(nextSnakeTurn(3, 1, 0)).toEqual({ nextTurn: 0, nextDirection: 1 })
    expect(nextSnakeTurn(0, -1, -5)).toEqual({ nextTurn: 0, nextDirection: -1 })
  })

  it('clamps below zero and flips direction', () => {
    expect(nextSnakeTurn(0, -1, 3)).toEqual({ nextTurn: 0, nextDirection: 1 })
  })
})

describe('undoPayload', () => {
  it('marks undone metadata and preserves prior payload', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))
    const result = undoPayload({ draftTurnBefore: 1 }, 'admin-1')
    expect(result).toEqual({
      draftTurnBefore: 1,
      undone: true,
      undoneBy: 'admin-1',
      undoneAt: new Date('2025-01-01T00:00:00.000Z').toISOString(),
    })
    vi.useRealTimers()
  })
})

describe('shuffleOrder', () => {
  it('returns a new array with the same items', () => {
    const input = ['a', 'b', 'c']
    const result = shuffleOrder(input, () => 0.42)
    expect(result).toHaveLength(input.length)
    expect(result).not.toBe(input)
    expect(new Set(result)).toEqual(new Set(input))
  })

  it('shuffles deterministically with a fixed rng', () => {
    const input = [1, 2, 3]
    const result = shuffleOrder(input, () => 0)
    expect(result).toEqual([2, 3, 1])
  })
})
