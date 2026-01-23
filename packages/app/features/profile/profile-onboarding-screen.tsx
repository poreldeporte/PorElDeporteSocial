import type { ScrollViewProps } from 'react-native'
import { type ReactNode } from 'react'

import { ProfileFormScreen } from './edit-screen'
import { useAppRouter } from 'app/utils/useAppRouter'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const ProfileOnboardingScreen = (props: ScrollHeaderProps) => {
  const router = useAppRouter()
  return (
    <ProfileFormScreen
      submitLabel="Continue to communities"
      showStatusBadge={false}
      variant="immersive"
      floatingCta
      onComplete={() => router.push('/onboarding/review')}
      {...props}
    />
  )
}
