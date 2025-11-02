import { ChevronRight } from '@tamagui/lucide-icons'
import { Button, XStack } from 'tamagui'

import { OnboardingControlsProps } from './OnboardingControls'

export const OnboardingControls = ({
  currentIdx,
  onChange,
  stepsCount,
  onFinish,
}: OnboardingControlsProps) => {
  const handleGoNext = () => {
    if (currentIdx + 1 > stepsCount - 1) {
      onFinish?.()
      return
    }
    onChange(currentIdx + 1)
  }

  const handleSkip = () => {
    onFinish?.()
  }

  return (
    <XStack jc="space-between" ai="center" p="$5" gap="$5">
      <Button
        chromeless
        pressStyle={{
          bg: '$color6',
        }}
        br="$10"
        onPress={() => handleSkip()}
      >
        <Button.Text col="$color">Skip</Button.Text>
      </Button>

      <Button
        pressStyle={{
          bg: '$color6',
          boc: '$color6',
        }}
        chromeless
        bordered
        boc="$color"
        f={1}
        br="$10"
        onPress={() => handleGoNext()}
        iconAfter={ChevronRight}
      >
        <Button.Text col="$color">Continue</Button.Text>
      </Button>
    </XStack>
  )
}
