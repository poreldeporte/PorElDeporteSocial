import { useFieldInfo, useTsController } from '@ts-react/form'
import { useId, useImperativeHandle, useRef } from 'react'
import { Fieldset, type InputProps, Label, Theme, XStack } from 'tamagui'
import { z } from 'zod'

import { FieldError } from '../FieldError'
import { Shake } from '../Shake'
import { DatePickerExample } from '../elements/datepicker/DatePicker'

export const DateSchema = z.object({
  dateValue: z.coerce.date(),
})

export const DateField = (props: Pick<InputProps, 'size'>) => {
  const {
    field,
    error,
    formState: { isSubmitting },
  } = useTsController<z.infer<typeof DateSchema>>()

  const { label } = useFieldInfo()
  const id = useId()
  const disabled = isSubmitting
  const rawErrorMessage = error?.dateValue?.errorMessage ?? error?.errorMessage
  const errorMessage =
    rawErrorMessage === 'Required' && label
      ? `${label} is required`
      : rawErrorMessage === 'Invalid date'
      ? 'Enter a valid date'
      : rawErrorMessage

  const inputRef = useRef<HTMLInputElement>(null) // Initialize with null
  const safeDateValue =
    field.value?.dateValue && Number.isFinite(field.value.dateValue.getTime())
      ? field.value.dateValue
      : undefined

  useImperativeHandle(field.ref, () => inputRef.current) // Access the current value

  return (
    <Fieldset gap="$2">
      <Label theme="alt1" size="$3">
        {label}
      </Label>

      <XStack $sm={{ fd: 'column' }} $gtSm={{ fw: 'wrap' }} gap="$4">
        <Theme name={errorMessage ? 'red' : null} forceClassName>
          <Fieldset $gtSm={{ fb: 0 }} f={1}>
            <Shake shakeKey={error?.dateValue?.errorMessage}>
              <DatePickerExample
                disabled={disabled}
                placeholderTextColor="$color10"
                value={safeDateValue ? safeDateValue.toISOString() : undefined}
                onChangeText={(dateValue) => {
                  if (!dateValue) {
                    field.onChange({ ...(field.value ?? {}), dateValue: undefined })
                    return
                  }
                  const next = new Date(dateValue)
                  if (!Number.isFinite(next.getTime())) {
                    field.onChange({ ...(field.value ?? {}), dateValue: undefined })
                    return
                  }
                  field.onChange({ ...(field.value ?? {}), dateValue: next })
                }}
                onBlur={field.onBlur}
                ref={inputRef}
                placeholder=""
                id={`${id}-date-value`}
                {...props}
              />
            </Shake>
            <FieldError message={errorMessage} />
          </Fieldset>
        </Theme>
      </XStack>
    </Fieldset>
  )
}
