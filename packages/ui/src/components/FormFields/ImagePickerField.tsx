import { useFieldInfo, useTsController } from '@ts-react/form'
import { useId, useImperativeHandle, useRef } from 'react'
import { Fieldset, type InputProps, Label, Theme, XStack } from 'tamagui'
import { z } from 'zod'

import { FieldError } from '../FieldError'
import { Shake } from '../Shake'
import { ImagePicker } from '../elements/pickers/ImagePicker'

export const ImagePickerSchema = z.object({
  path: z.string(),
  fileURL: z.any(),
  // fileURL: z.instanceof(Blob),
})

export const ImagePickerField = (props: Pick<InputProps, 'size'>) => {
  const {
    field,
    error,
    formState: { isSubmitting },
  } = useTsController<z.infer<typeof ImagePickerSchema>>()
  const { label } = useFieldInfo()
  const id = useId()
  const disabled = isSubmitting
  // Use the useImperativeHandle hook to set the ref callback
  const inputRef = useRef<HTMLInputElement>(null) // Initialize with null

  useImperativeHandle(field.ref, () => inputRef.current) // Access the current value

  return (
    <Fieldset gap="$2">
      <Label color="$color12" size="$3">
        {label}
      </Label>

      <XStack $sm={{ fd: 'column' }} $gtSm={{ fw: 'wrap' }} gap="$4">
        <Theme name={error ? 'red' : null} forceClassName>
          <Fieldset $gtSm={{ fb: 0 }} f={1}>
            <Shake shakeKey={error?.errorMessage}>
              <ImagePicker
                disabled={disabled}
                placeholderTextColor="$color10"
                value={field?.value ? field.value.fileURL : ''}
                onChangeText={(imageSource) => {
                  console.log('imageSource', imageSource)
                  console.log('field.value', field.value)
                  return field.onChange(imageSource)
                }}
                onBlur={field.onBlur}
                ref={inputRef}
                placeholder=""
                id={`${id}-date-value`}
                {...props}
              />
            </Shake>
            <FieldError message={error?.errorMessage} />
          </Fieldset>
        </Theme>
      </XStack>
    </Fieldset>
  )
}
