import { Paragraph, XStack, YStack } from '@my/ui/public'
import { CheckCircle2, Circle } from '@tamagui/lucide-icons'

const REQUIREMENTS = [
  {
    id: 'length',
    label: 'At least 6 characters',
    test: (value: string) => value.length >= 6,
  },
  {
    id: 'number',
    label: 'Includes a number',
    test: (value: string) => /\d/.test(value),
  },
  {
    id: 'letter',
    label: 'Includes a letter',
    test: (value: string) => /[a-zA-Z]/.test(value),
  },
]

type PasswordChecklistProps = {
  value: string
}

export const PasswordChecklist = ({ value }: PasswordChecklistProps) => {
  const rules = value
    ? REQUIREMENTS
    : REQUIREMENTS.slice(0, 1)

  return (
    <YStack gap="$1" role="list">
      {rules.map((rule) => {
        const met = value ? rule.test(value) : false
        const Icon = met ? CheckCircle2 : Circle
        return (
          <XStack key={rule.id} ai="center" gap="$2" role="listitem">
            <Icon size={16} color={met ? '#1db954' : '#999'} strokeWidth={2} />
            <Paragraph size="$2" theme={met ? 'alt1' : 'alt2'}>
              {rule.label}
            </Paragraph>
          </XStack>
        )
      })}
    </YStack>
  )
}
