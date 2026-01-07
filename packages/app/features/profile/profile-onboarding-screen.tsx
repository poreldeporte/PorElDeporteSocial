import type { ScrollViewProps } from 'react-native'
import { type ReactNode } from 'react'
import { useRouter } from 'solito/router'

import { ProfileFormScreen } from './edit-screen'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const ProfileOnboardingScreen = (props: ScrollHeaderProps) => {
  const router = useRouter()
  return (
    <ProfileFormScreen
      submitLabel="Finish setup"
      showStatusBadge={false}
      onComplete={() => router.push('/onboarding/review')}
      {...props}
    />
  )
}
