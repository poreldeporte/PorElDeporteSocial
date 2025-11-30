import { Card, Paragraph, SizableText, XStack, YStack, isWeb } from '@my/ui'
import type { Control } from 'react-hook-form'
import { useController } from 'react-hook-form'

import {
  POSITION_OPTIONS,
  type PositionOption,
  type SignUpFieldValues,
} from '../../profile/profile-field-schema'

const POSITION_META: Record<
  PositionOption,
  {
    description: string
    availability: string
  }
> = {
  Goalie: {
    description: 'Command the box and keep clean sheets.',
    availability: '1 spot open',
  },
  Defender: {
    description: 'Lock down the back line and win duels.',
    availability: '3 spots open',
  },
  Midfielder: {
    description: 'Control tempo and connect every line.',
    availability: '4 spots open',
  },
  Attacker: {
    description: 'Stretch defenses and finish chances.',
    availability: '2 spots open',
  },
}

type PositionCardGroupProps = {
  control: Control<SignUpFieldValues>
}

export const PositionCardGroup = ({ control }: PositionCardGroupProps) => {
  const { field } = useController({ control, name: 'position' })

  return (
    <YStack gap="$2" role="radiogroup">
      <Paragraph size="$2" theme="alt2">
        Pick where you want to make your mark. We’ll keep these squads balanced.
      </Paragraph>
      <XStack gap="$3" flexWrap="wrap">
        {POSITION_OPTIONS.map((option) => {
          const selected = field.value === option
          const meta = POSITION_META[option]
          return (
            <Card
              key={option}
              role="radio"
              aria-checked={selected}
              pressStyle={{ transform: [{ scale: 0.97 }] }}
              bordered={!selected}
              bw={selected ? 0 : undefined}
              bc={selected ? '$color9' : '$color6'}
              bg={selected ? '$color4' : '$color2'}
              px="$3"
              py="$3"
              f={isWeb ? 1 : undefined}
              minWidth={isWeb ? 200 : undefined}
              $platform-native={{ flexBasis: '48%' }}
              onPress={() => field.onChange(option)}
            >
              <YStack gap="$2">
                <SizableText size="$5" fontWeight="600">
                  {option}
                </SizableText>
                <Paragraph size="$2" theme="alt1">
                  {meta.description}
                </Paragraph>
                <Paragraph size="$2" theme="alt2">
                  {meta.availability}
                </Paragraph>
              </YStack>
            </Card>
          )
        })}
      </XStack>
    </YStack>
  )
}
