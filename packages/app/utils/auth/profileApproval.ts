export type ProfileApproval = {
  approval_status: 'draft' | 'pending' | 'approved' | 'rejected' | null
}

export const PROFILE_APPROVAL_FIELDS = 'approval_status'

export const isProfileApproved = (profile: ProfileApproval | null | undefined) => {
  return profile?.approval_status === 'approved'
}
