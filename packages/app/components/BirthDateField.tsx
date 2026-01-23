import { useFieldInfo, useTsController } from '@ts-react/form'
import { useId } from 'react'
import { Fieldset, Input, type InputProps, Label, Theme, XStack, formInputStyle } from '@my/ui/public'

import { FieldError } from '@my/ui/public'
import {
  emptyBirthDateParts,
  normalizeBirthDatePart,
  type BirthDateParts,
} from 'app/utils/birthDate'
import { Shake } from '@my/ui/public'

type BirthDateFieldProps = Pick<InputProps, 'size'>

export const BirthDateField = (props: BirthDateFieldProps) => {
  const {
    field,
    error,
    formState: { isSubmitting },
  } = useTsController<BirthDateParts>()
  const { label } = useFieldInfo()
  const id = useId()
  const disabled = isSubmitting
  const value = field.value ?? emptyBirthDateParts()
  const rawErrorMessage =
    error?.errorMessage ||
    error?.month?.errorMessage ||
    error?.day?.errorMessage ||
    error?.year?.errorMessage
  const errorMessage =
    rawErrorMessage === 'Required' && label ? `${label} is required` : rawErrorMessage
  const updatePart = (key: keyof BirthDateParts, nextValue: string, maxLength: number) => {
    const normalized = normalizeBirthDatePart(nextValue, maxLength)
    const next = field.value ?? emptyBirthDateParts()
    field.onChange({ ...next, [key]: normalized })
  }

  return (
    <Theme name={errorMessage ? 'red' : null} forceClassName>
      <Fieldset gap="$2">
        {!!label && (
          <Label color="$color12" size={props.size || '$3'} htmlFor={id}>
            {label}
          </Label>
        )}
        <Shake shakeKey={rawErrorMessage}>
          <XStack gap="$2" w="100%">
            <Input
              id={`${id}-month`}
              f={1}
              minWidth={0}
              placeholder="MM"
              placeholderTextColor="$color10"
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={2}
              value={value.month}
              onChangeText={(text) => updatePart('month', text, 2)}
              onBlur={field.onBlur}
              ref={field.ref}
              disabled={disabled}
              textAlign="center"
              {...formInputStyle}
              {...props}
            />
            <Input
              id={`${id}-day`}
              f={1}
              minWidth={0}
              placeholder="DD"
              placeholderTextColor="$color10"
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={2}
              value={value.day}
              onChangeText={(text) => updatePart('day', text, 2)}
              onBlur={field.onBlur}
              disabled={disabled}
              textAlign="center"
              {...formInputStyle}
              {...props}
            />
            <Input
              id={`${id}-year`}
              f={1}
              minWidth={0}
              placeholder="YYYY"
              placeholderTextColor="$color10"
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={4}
              value={value.year}
              onChangeText={(text) => updatePart('year', text, 4)}
              onBlur={field.onBlur}
              disabled={disabled}
              textAlign="center"
              {...formInputStyle}
              {...props}
            />
          </XStack>
        </Shake>
        <FieldError message={errorMessage} />
      </Fieldset>
    </Theme>
  )
}
