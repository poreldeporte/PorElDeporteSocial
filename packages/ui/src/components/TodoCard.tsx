import { Check } from '@tamagui/lucide-icons'
import { useId } from 'react'
import { Card, Checkbox, CheckboxProps, Label, Paragraph, Theme, XStack, YStack } from 'tamagui'

export const TodoCard = ({
  id: _id,
  label,
  ...props
}: {
  label: string
} & CheckboxProps) => {
  const reactId = useId()
  const id = _id || reactId

  return (
    <Theme name={props.checked ? 'green' : null} forceClassName>
      <Card bg="$background" br="$0">
        <Card.Header padded>
          <Label htmlFor={id}>
            <XStack gap="$4">
              <Checkbox {...props} id={id}>
                <Checkbox.Indicator>
                  <Check />
                </Checkbox.Indicator>
              </Checkbox>
              <YStack flex={1}>
                <Paragraph
                  textDecorationLine={props.checked ? 'line-through' : 'none'}
                  size="$3"
                  width={120}
                >
                  {label}
                </Paragraph>
                <Paragraph size="$1" theme="alt2">
                  {props.checked ? 'Completed' : 'To do'}
                </Paragraph>
              </YStack>
            </XStack>
          </Label>
        </Card.Header>
      </Card>
    </Theme>
  )
}
