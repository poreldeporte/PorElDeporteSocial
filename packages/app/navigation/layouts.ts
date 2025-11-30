export type ScreenLayoutId =
  | 'tabsRoot'
  | 'gamesList'
  | 'gameDetail'
  | 'gameDraft'
  | 'gameEdit'
  | 'gameResult'
  | 'profile'
  | 'profileEdit'
  | 'leaderboard'
  | 'settings'
  | 'settingsGeneral'
  | 'settingsChangeEmail'
  | 'settingsChangePassword'
  | 'create'
  | 'community'
  | 'legalTerms'
  | 'legalPrivacy'
  | 'legalAbout'
  | 'authSignIn'
  | 'authSignUp'
  | 'authResetPassword'
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
  gameDetail: { id: 'gameDetail', title: 'Game Info' },
  gameDraft: { id: 'gameDraft', title: 'Draft Room' },
  gameEdit: { id: 'gameEdit', title: 'Edit Game' },
  gameResult: { id: 'gameResult', title: 'Game Result' },
  profile: { id: 'profile', title: 'My Profile' },
  profileEdit: { id: 'profileEdit', title: 'Edit Profile' },
  leaderboard: { id: 'leaderboard', title: 'Leaderboard' },
  settings: { id: 'settings', title: 'Settings' },
  settingsGeneral: { id: 'settingsGeneral', title: 'General' },
  settingsChangeEmail: { id: 'settingsChangeEmail', title: 'Change Email' },
  settingsChangePassword: { id: 'settingsChangePassword', title: 'Change Password' },
  create: { id: 'create', title: 'Create', stickyCta: 'primary' },
  community: { id: 'community', title: 'La Familia' },
  legalTerms: { id: 'legalTerms', title: 'Terms of Service' },
  legalPrivacy: { id: 'legalPrivacy', title: 'Privacy Policy' },
  legalAbout: { id: 'legalAbout', title: 'About' },
  authSignIn: { id: 'authSignIn', title: 'Sign In' },
  authSignUp: { id: 'authSignUp', title: 'Sign Up' },
  authResetPassword: { id: 'authResetPassword', title: 'Reset Password' },
  authOnboarding: { id: 'authOnboarding', title: 'Welcome' },
  createScreen: { id: 'createScreen', title: 'Create' },
  shop: { id: 'shop', title: 'Shop' },
}

export const getScreenLayout = (id: ScreenLayoutId) => screenLayouts[id]
