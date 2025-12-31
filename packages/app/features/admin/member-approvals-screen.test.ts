import { describe, expect, it } from 'vitest'

import { shouldInvalidatePendingApprovals } from './member-approvals-realtime'

describe('shouldInvalidatePendingApprovals', () => {
  it('returns true when the new status is pending', () => {
    expect(
      shouldInvalidatePendingApprovals({
        eventType: 'UPDATE',
        new: { approval_status: 'pending' },
        old: { approval_status: 'draft' },
      })
    ).toBe(true)
  })

  it('returns true when the old status is pending', () => {
    expect(
      shouldInvalidatePendingApprovals({
        eventType: 'UPDATE',
        new: { approval_status: 'approved' },
        old: { approval_status: 'pending' },
      })
    ).toBe(true)
  })

  it('returns false when neither status is pending', () => {
    expect(
      shouldInvalidatePendingApprovals({
        eventType: 'UPDATE',
        new: { approval_status: 'approved' },
        old: { approval_status: 'draft' },
      })
    ).toBe(false)
  })
})
