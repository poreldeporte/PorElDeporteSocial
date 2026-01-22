export type ScreenLayoutId =
  | 'tabsRoot'
  | 'gamesList'
  | 'gameHistory'
  | 'gameDetail'
  | 'gameDraft'
  | 'gameEdit'
  | 'gameResult'
  | 'gameReviews'
  | 'profile'
  | 'profileEdit'
  | 'profileOnboarding'
  | 'profileReview'
  | 'leaderboard'
  | 'settings'
  | 'settingsGeneral'
  | 'settingsCommunity'
  | 'settingsAccount'
  | 'settingsGroups'
  | 'settingsGroupCreate'
  | 'settingsGroupEdit'
  | 'adminApprovals'
  | 'adminApplications'
  | 'adminMemberEdit'
  | 'create'
  | 'community'
  | 'legalTerms'
  | 'legalPrivacy'
  | 'legalAbout'
  | 'authSignIn'
  | 'authSignUp'
  | 'authOnboarding'
  | 'createScreen'
  | 'shop'

type ScreenLayout = {
  id: ScreenLayoutId
  title: string
  stickyCta?: 'primary'
}

const screenLayouts: Record<ScreenLayoutId, ScreenLayout> = {
  tabsRoot: { id: 'tabsRoot', title: 'Por El Deporte' },
  gamesList: { id: 'gamesList', title: 'Schedule' },
  gameHistory: { id: 'gameHistory', title: 'Game history' },
  gameDetail: { id: 'gameDetail', title: 'Game Info' },
  gameDraft: { id: 'gameDraft', title: 'Draft Room' },
  gameEdit: { id: 'gameEdit', title: 'Edit Game' },
  gameResult: { id: 'gameResult', title: 'Game Result' },
  gameReviews: { id: 'gameReviews', title: 'Game Reviews' },
  profile: { id: 'profile', title: 'My Profile' },
  profileEdit: { id: 'profileEdit', title: 'Edit Profile' },
  profileOnboarding: { id: 'profileOnboarding', title: 'Finish Setup' },
  profileReview: { id: 'profileReview', title: 'Member Review' },
  leaderboard: { id: 'leaderboard', title: 'Leaderboard' },
  settings: { id: 'settings', title: 'Settings' },
  settingsGeneral: { id: 'settingsGeneral', title: 'General' },
  settingsCommunity: { id: 'settingsCommunity', title: 'Community settings' },
  settingsAccount: { id: 'settingsAccount', title: 'Account' },
  settingsGroups: { id: 'settingsGroups', title: 'Groups' },
  settingsGroupCreate: { id: 'settingsGroupCreate', title: 'Create group' },
  settingsGroupEdit: { id: 'settingsGroupEdit', title: 'Edit group' },
  adminApprovals: { id: 'adminApprovals', title: 'Members' },
  adminApplications: { id: 'adminApplications', title: 'Applications' },
  adminMemberEdit: { id: 'adminMemberEdit', title: 'Edit member' },
  create: { id: 'create', title: 'Create', stickyCta: 'primary' },
  community: { id: 'community', title: 'La Familia' },
  legalTerms: { id: 'legalTerms', title: 'Terms of Service' },
  legalPrivacy: { id: 'legalPrivacy', title: 'Privacy Policy' },
  legalAbout: { id: 'legalAbout', title: 'About' },
  authSignIn: { id: 'authSignIn', title: 'Por El Deporte' },
  authSignUp: { id: 'authSignUp', title: 'Por El Deporte' },
  authOnboarding: { id: 'authOnboarding', title: 'Por El Deporte' },
  createScreen: { id: 'createScreen', title: 'Create' },
  shop: { id: 'shop', title: 'Shop' },
}

export const getScreenLayout = (id: ScreenLayoutId) => screenLayouts[id]
