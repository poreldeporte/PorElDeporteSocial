import { useMemo } from 'react'

import { Button, FieldError, Input, Label, Paragraph, XStack, YStack, formInputStyle } from '@my/ui/public'
import { useController, useFormContext } from 'react-hook-form'

import { formatTimeList, parseTimeList } from '../time-list'

type TimeListFieldProps = {
  name: string
  label: string
  helper?: string
}

const DEFAULT_TIME = '09:00'

export const TimeListField = ({ name, label, helper }: TimeListFieldProps) => {
  const { control } = useFormContext()
  const { field, fieldState } = useController({ name, control })
  const times = useMemo(() => parseTimeList(field.value ?? ''), [field.value])

  const updateTimes = (nextTimes: string[]) => field.onChange(formatTimeList(nextTimes))

  const handleAdd = () => {
    const fallback = times[times.length - 1] ?? DEFAULT_TIME
    updateTimes([...times, fallback])
  }

  const handleUpdate = (index: number, value: string) => {
    const nextTimes = [...times]
    nextTimes[index] = value
    updateTimes(nextTimes)
  }

  const handleRemove = (index: number) => {
    const nextTimes = times.filter((_, idx) => idx !== index)
    updateTimes(nextTimes)
  }

  return (
    <YStack gap="$2">
      <Label color="$color12" size="$3">
        {label}
      </Label>
      {helper ? (
        <Paragraph theme="alt2" size="$2">
          {helper}
        </Paragraph>
      ) : null}
      <YStack gap="$2">
        {times.length ? (
          times.map((time, index) => (
            <XStack key={`${name}-${index}`} gap="$2" ai="center" flexWrap="wrap">
              <Input
                type="time"
                value={time}
                onChangeText={(value) => handleUpdate(index, value)}
                {...formInputStyle}
              />
              <Button size="$3" theme="red" variant="outlined" onPress={() => handleRemove(index)}>
                Remove
              </Button>
            </XStack>
          ))
        ) : (
          <Paragraph theme="alt2" size="$2">
            No times set.
          </Paragraph>
        )}
        <Button size="$3" variant="outlined" onPress={handleAdd}>
          Add time
        </Button>
      </YStack>
      {fieldState.error?.message ? <FieldError message={fieldState.error.message} /> : null}
    </YStack>
  )
}
