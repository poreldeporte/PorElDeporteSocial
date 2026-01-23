import { useFieldInfo, useTsController } from '@ts-react/form'
import { useId } from 'react'
import { Fieldset, Label, TextArea, TextAreaProps, Theme } from 'tamagui'

import { FieldError } from '../FieldError'
import { formInputStyle } from './formInputStyle'
import { Shake } from '../Shake'

export const TextAreaField = (props: Pick<TextAreaProps, 'size' | 'autoFocus'>) => {
  const {
    field,
    error,
    formState: { isSubmitting },
  } = useTsController<string>()
  const { label, isOptional, placeholder } = useFieldInfo()
  const id = useId()
  const disabled = isSubmitting
  return (
    <Theme name={error ? 'red' : null} forceClassName>
      <Fieldset>
        {!!label && (
          <Label color="$color12" size={props.size || '$3'} htmlFor={id}>
            {label} {isOptional && `(Optional)`}
          </Label>
        )}
        <Shake shakeKey={error?.errorMessage}>
          <TextArea
            disabled={disabled}
            placeholderTextColor="$color10"
            value={field.value}
            onChangeText={(text) => field.onChange(text)}
            onBlur={field.onBlur}
            ref={field.ref}
            placeholder={placeholder}
            id={id}
            rows={5}
            // temp fix
            h={150}
            w="100%"
            {...formInputStyle}
            {...props}
          />
        </Shake>
        <FieldError message={error?.errorMessage} />
      </Fieldset>
    </Theme>
  )
}
