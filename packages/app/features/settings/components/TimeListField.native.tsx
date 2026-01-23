import { useMemo, useState } from 'react'
import { Platform } from 'react-native'

import DateTimePicker from '@react-native-community/datetimepicker'
import {
  Button,
  FieldError,
  Label,
  Paragraph,
  XStack,
  YStack,
} from '@my/ui/public'
import { useController, useFormContext } from 'react-hook-form'

import { buildDateFromTime, formatTimeList, formatTimeValue, parseTimeList } from '../time-list'

type TimeListFieldProps = {
  name: string
  label: string
  helper?: string
}

type PickerState = {
  index: number
  value: Date
}

const DEFAULT_TIME = '09:00'

export const TimeListField = ({ name, label, helper }: TimeListFieldProps) => {
  const { control } = useFormContext()
  const { field, fieldState } = useController({ name, control })
  const times = useMemo(() => parseTimeList(field.value ?? ''), [field.value])
  const [pickerState, setPickerState] = useState<PickerState | null>(null)

  const updateTimes = (nextTimes: string[]) => field.onChange(formatTimeList(nextTimes))

  const openPicker = (index: number) => {
    const fallbackTime = times[times.length - 1] ?? DEFAULT_TIME
    const timeValue = times[index] ?? fallbackTime
    setPickerState({ index, value: buildDateFromTime(timeValue) })
  }

  const handleRemove = (index: number) => {
    const nextTimes = times.filter((_, idx) => idx !== index)
    updateTimes(nextTimes)
  }

  const handlePickerChange = (_event: unknown, date?: Date) => {
    if (!date || !pickerState) {
      if (Platform.OS === 'android') setPickerState(null)
      return
    }
    const nextTime = formatTimeValue(date)
    const nextTimes = [...times]
    if (pickerState.index >= nextTimes.length) {
      nextTimes.push(nextTime)
    } else {
      nextTimes[pickerState.index] = nextTime
    }
    updateTimes(nextTimes)
    if (Platform.OS === 'android') setPickerState(null)
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
              <Button size="$3" onPress={() => openPicker(index)}>
                {time}
              </Button>
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
        <Button size="$3" variant="outlined" onPress={() => openPicker(times.length)}>
          Add time
        </Button>
      </YStack>
      {fieldState.error?.message ? <FieldError message={fieldState.error.message} /> : null}
      {pickerState ? (
        <YStack gap="$2">
          <DateTimePicker
            mode="time"
            value={pickerState.value}
            onChange={handlePickerChange}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          />
          {Platform.OS === 'ios' ? (
            <Button size="$2" onPress={() => setPickerState(null)}>
              Done
            </Button>
          ) : null}
        </YStack>
      ) : null}
    </YStack>
  )
}
