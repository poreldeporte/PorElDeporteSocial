import { isProfileApproved } from './profileApproval'

describe('isProfileApproved', () => {
  it('returns true when approval status is approved', () => {
    expect(isProfileApproved({ approval_status: 'approved' })).toBe(true)
  })

  it('returns false for pending or missing profiles', () => {
    expect(isProfileApproved({ approval_status: 'pending' })).toBe(false)
    expect(isProfileApproved({ approval_status: 'draft' })).toBe(false)
    expect(isProfileApproved(null)).toBe(false)
    expect(isProfileApproved(undefined)).toBe(false)
  })
})
