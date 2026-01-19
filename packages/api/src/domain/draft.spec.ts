import { describe, expect, it } from 'vitest'

import { nextOriginalTurn, originalTurnForPick } from './draft'

const ORIGINAL_SEQUENCE = [0, 1, 0, 1, 0, 1, 1, 0, 1, 0]

describe('original draft order', () => {
  it('maps pick order to team index', () => {
    ORIGINAL_SEQUENCE.forEach((teamIndex, index) => {
      expect(originalTurnForPick(index + 1, 2)).toBe(teamIndex)
    })
  })

  it('returns the next team index after a pick', () => {
    ORIGINAL_SEQUENCE.forEach((_, index) => {
      const pickOrder = index + 1
      const expectedNext = ORIGINAL_SEQUENCE[pickOrder] ?? null
      expect(nextOriginalTurn(pickOrder, 2).nextTurn).toBe(expectedNext)
    })
  })
})
