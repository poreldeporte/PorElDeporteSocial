import { Button, H4, OverviewCard, Theme, XStack, YStack } from '@my/ui/public'
import { ArrowRight } from '@tamagui/lucide-icons'

import { ScrollAdapt } from './scroll-adapt'

export const OverviewSection = () => {
  return (
    <YStack>
      <XStack px="$4.5" ai="center" gap="$2" jc="space-between" mb="$4">
        <H4 theme="alt1" fow="400">
          Overview
        </H4>
        <Theme name="alt2">
          <Button size="$2" chromeless iconAfter={ArrowRight}>
            View All Stats
          </Button>
        </Theme>
      </XStack>

      <ScrollAdapt itemWidth={180} withSnap>
        <XStack fw="wrap" ai="flex-start" jc="flex-start" px="$4" gap="$8" mb="$4">
          <OverviewCard title="MRR" value="$18,908" badgeText="+0.5%" badgeState="success" />

          <OverviewCard title="ARR" value="$204,010" badgeText="+40.5%" badgeState="success" />

          <OverviewCard
            title="Today's new users"
            value="4 Users"
            badgeText="+25%"
            badgeState="success"
          />

          <OverviewCard
            title="Weekly Post Views"
            value="30,104"
            badgeText="-2%"
            badgeState="failure"
          />
        </XStack>
      </ScrollAdapt>
    </YStack>
  )
}
