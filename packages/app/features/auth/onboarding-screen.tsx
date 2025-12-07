import { Onboarding, OnboardingStepInfo, StepContent } from '@my/ui/public'
import { CalendarCheck, Trophy, Users } from '@tamagui/lucide-icons'
import React from 'react'
import { useRouter } from 'solito/router'

const steps: OnboardingStepInfo[] = [
  {
    theme: 'orange',
    Content: () => (
      <StepContent
        title="Join the club"
        icon={Users}
        description="Create your Por El Deporte profile and unlock access to curated members-only runs."
      />
    ),
  },
  {
    theme: 'green',
    Content: () => (
      <StepContent
        title="Sign up for games"
        icon={CalendarCheck}
        description="Claim a roster spot in seconds—no endless group chats, just confirmed kickoff times."
      />
    ),
  },
  {
    theme: 'blue',
    Content: () => (
      <StepContent
        title="Make your mark"
        icon={Trophy}
        description="Make a name for yourself in one of Miami's most elite fútbol communities."
      />
    ),
  },
]

/**
 * note: this screen is used as a standalone page on native and as a sidebar on auth layout on web
 */
export const OnboardingScreen = () => {
  const router = useRouter()
  return <Onboarding autoSwipe onOnboarded={() => router.push('/sign-up')} steps={steps} />
}
