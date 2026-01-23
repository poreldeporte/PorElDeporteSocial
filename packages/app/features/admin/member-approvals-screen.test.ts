import { describe, expect, it } from 'vitest'

import { shouldInvalidatePendingApprovals } from './member-approvals-realtime'

describe('shouldInvalidatePendingApprovals', () => {
  it('returns true when the new status is pending', () => {
    expect(
      shouldInvalidatePendingApprovals({
        eventType: 'UPDATE',
        new: { status: 'pending' },
        old: { status: 'rejected' },
      })
    ).toBe(true)
  })

  it('returns true when the old status is pending', () => {
    expect(
      shouldInvalidatePendingApprovals({
        eventType: 'UPDATE',
        new: { status: 'approved' },
        old: { status: 'pending' },
      })
    ).toBe(true)
  })

  it('returns false when neither status is pending', () => {
    expect(
      shouldInvalidatePendingApprovals({
        eventType: 'UPDATE',
        new: { status: 'approved' },
        old: { status: 'rejected' },
      })
    ).toBe(false)
  })

  it('returns false when the community does not match', () => {
    expect(
      shouldInvalidatePendingApprovals(
        {
          eventType: 'UPDATE',
          new: { status: 'pending', community_id: 'other' },
          old: { status: 'approved', community_id: 'other' },
        },
        'active'
      )
    ).toBe(false)
  })
})
