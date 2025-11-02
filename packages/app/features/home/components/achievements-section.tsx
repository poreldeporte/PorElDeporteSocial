import { validToken, AchievementCard, Button, H4, Theme, XStack, YStack, ThemeName } from '@my/ui'
import { ArrowRight, DollarSign } from '@tamagui/lucide-icons'
import { Platform } from 'react-native'
import { useLink } from 'solito/link'

import { ScrollAdapt } from './scroll-adapt'

const halfMinusSpace = validToken(
  Platform.select({
    web: 'calc(50% - 12px)',
    native: '53%',
  })
)

const quarterMinusSpace = validToken(
  Platform.select({
    web: 'calc(25% - 12px)',
    native: '21%',
  })
)

const achievementData: {
  title: string
  progress: { current: number; full: number; label: string }
  theme: ThemeName
}[] = [
  {
    title: 'Make your first 100K',
    progress: { current: 81_500, full: 100_000, label: 'dollars made' },
    theme: 'green',
  },
  {
    title: 'Build your community',
    progress: { current: 280, full: 500, label: 'members' },
    theme: 'blue',
  },
  {
    title: 'Set up your profile',
    progress: { current: 2, full: 3, label: 'steps completed' },
    theme: 'orange',
  },
  {
    title: 'Refer 5 friends',
    progress: { current: 4, full: 5, label: 'friends referred' },
    theme: 'pink',
  },
]

export const AchievementsSection = () => {
  return (
    <YStack>
      <XStack px="$4.5" ai="center" gap="$2" jc="space-between" mb="$4">
        <H4 theme="alt1" fow="400">
          Getting Started
        </H4>
        <Button theme="alt2" size="$2" chromeless iconAfter={ArrowRight}>
          All Achievements
        </Button>
      </XStack>

      <ScrollAdapt>
        <XStack w="100%" px="$4" fw="wrap" f={1} gap="$3">
          {achievementData.map((achievement) => (
            <Theme key={achievement.title} name={achievement.theme}>
              <AchievementCard
                w={300}
                $gtMd={{
                  w: halfMinusSpace,
                }}
                $gtLg={{
                  w: quarterMinusSpace,
                }}
                icon={DollarSign}
                title={achievement.title}
                progress={achievement.progress}
                action={{
                  text: 'Boost your sales',
                  props: useLink({ href: '#' }),
                }}
              />
            </Theme>
          ))}
        </XStack>
      </ScrollAdapt>
    </YStack>
  )
}
