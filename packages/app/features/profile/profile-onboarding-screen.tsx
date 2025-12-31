import { useRouter } from 'solito/router'

import { ProfileFormScreen } from './edit-screen'

export const ProfileOnboardingScreen = () => {
  const router = useRouter()
  return (
    <ProfileFormScreen
      submitLabel="Finish setup"
      showStatusBadge={false}
      onComplete={() => router.replace('/onboarding/review')}
    />
  )
}
