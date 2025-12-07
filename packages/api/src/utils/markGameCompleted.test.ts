import { describe, expect, it } from 'vitest'

import { markGameCompletedIfNeeded } from './markGameCompleted'

type RecordedCall = { values: Record<string, unknown>; eq?: [string, string]; neq?: [string, string] }

const makeFakeSupabase = (calls: RecordedCall[]) =>
  ({
    from(table: string) {
      expect(table).toBe('games')
      return {
        update(values: Record<string, unknown>) {
          const call: RecordedCall = { values }
          calls.push(call)
          return {
            eq(column: string, value: string) {
              call.eq = [column, value]
              return this
            },
            neq(column: string, value: string) {
              call.neq = [column, value]
              return Promise.resolve({ error: null })
            },
          }
        },
      }
    },
  }) as any

describe('markGameCompletedIfNeeded', () => {
  it('updates completed once when needed', async () => {
    const calls: RecordedCall[] = []
    const supabase = makeFakeSupabase(calls)

    await markGameCompletedIfNeeded(supabase, 'game-1', true)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({
      values: { status: 'completed' },
      eq: ['id', 'game-1'],
      neq: ['status', 'completed'],
    })

    await markGameCompletedIfNeeded(supabase, 'game-2', false)
    expect(calls).toHaveLength(1)
  })
})
