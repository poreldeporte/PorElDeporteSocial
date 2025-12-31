import {
  AddressField,
  AddressSchema,
  BooleanCheckboxField,
  BooleanField,
  BooleanSwitchField,
  FieldError,
  Form,
  type FormProps,
  FormWrapper,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
  Theme,
  YStack,
} from '@my/ui/public'
import { DateField, DateSchema } from '@my/ui/src/components/FormFields/DateField'
import {
  ImagePickerField,
  ImagePickerSchema,
} from '@my/ui/src/components/FormFields/ImagePickerField'
import { createTsForm, createUniqueFieldSchema } from '@ts-react/form'
import type { ComponentProps } from 'react'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'

const selectSchema = z.string()
const selectField = createUniqueFieldSchema(selectSchema, 'select')
const selectOptionalField = createUniqueFieldSchema(selectSchema.optional(), 'select_optional')
const selectMultiSchema = z.array(z.string())
const selectMultiField = createUniqueFieldSchema(selectMultiSchema, 'select_multi')
const addressField = createUniqueFieldSchema(AddressSchema, 'address')
const addressOptionalField = createUniqueFieldSchema(AddressSchema.optional(), 'address_optional')
const imageField = createUniqueFieldSchema(ImagePickerSchema, 'image')
const imageOptionalField = createUniqueFieldSchema(
  ImagePickerSchema.optional(),
  'image_optional'
)
const passwordField = createUniqueFieldSchema(z.string(), 'password')

export const formFields = {
  text: z.string(),
  password: passwordField,
  textarea: createUniqueFieldSchema(z.string(), 'textarea'),
  /**
   * input that takes number
   */
  number: z.number(),
  /**
   * adapts to native switch on native, and native checkbox on web
   */
  boolean: z.boolean(),
  /**
   * switch field on all platforms
   */
  boolean_switch: createUniqueFieldSchema(z.boolean(), 'boolean_switch'),
  /**
   * checkbox field on all platforms
   */
  boolean_checkbox: createUniqueFieldSchema(z.boolean(), 'boolean_checkbox'),
  /**
   * make sure to pass options={} to props for this
   */
  select: selectField,
  selectOptional: selectOptionalField,
  selectMulti: selectMultiField,
  /**
   * example of how to handle more complex fields
   */
  address: addressField,
  addressOptional: addressOptionalField,
  date: createUniqueFieldSchema(DateSchema, 'date'),
  image: imageField,
  imageOptional: imageOptionalField,
}

// function createFormSchema<T extends ZodRawShape>(getData: (fields: typeof formFields) => T) {
//   return z.object(getData(formFields))
// }

const mapping = [
  [formFields.text, TextField] as const,
  [formFields.textarea, TextAreaField] as const,
  [formFields.number, NumberField] as const,
  [formFields.boolean, BooleanField] as const,
  [formFields.boolean_switch, BooleanSwitchField] as const,
  [formFields.boolean_checkbox, BooleanCheckboxField] as const,
  [formFields.select, SelectField] as const,
  [formFields.selectOptional, SelectField] as const,
  [formFields.selectMulti, SelectField] as const,
  [formFields.address, AddressField] as const,
  [formFields.addressOptional, AddressField] as const,
  [formFields.date, DateField] as const,
  [formFields.image, ImagePickerField] as const,
  [formFields.imageOptional, ImagePickerField] as const,
  [formFields.password, TextField] as const,
] as const

const FormComponent = (props: FormProps) => {
  return (
    <Form asChild {...props} minWidth="100%">
      <FormWrapper tag="form">{props.children}</FormWrapper>
    </Form>
  )
}

const _SchemaForm = createTsForm(mapping, {
  FormComponent,
})

type SchemaFormProps = ComponentProps<typeof _SchemaForm> & {
  bare?: boolean
  children?: ComponentProps<typeof _SchemaForm>['children']
}

export const SchemaForm = ({ bare, ...props }: SchemaFormProps) => {
  const renderAfter: ComponentProps<typeof _SchemaForm>['renderAfter'] = props.renderAfter
    ? (vars) => <FormWrapper.Footer>{props.renderAfter?.(vars)}</FormWrapper.Footer>
    : undefined

  return (
    <_SchemaForm {...props} renderAfter={renderAfter}>
      {(fields, context) => {
        const rendered = props.children ? props.children(fields, context) : Object.values(fields)
        if (bare) {
          return (
            <YStack minWidth="100%" $platform-native={{ miw: '100%' }} f={1}>
              {rendered}
            </YStack>
          )
        }
        return (
          <FormWrapper.Body minWidth="100%" $platform-native={{ miw: '100%' }}>
            {rendered}
          </FormWrapper.Body>
        )
      }}
    </_SchemaForm>
  )
}

// handle manual errors (most commonly coming from a server) for cases where it's not for a specific field - make sure to wrap inside a provider first
// stopped using it cause of state issues it introduced - set the errors to specific fields instead of root for now
export const RootError = () => {
  const context = useFormContext()
  const errorMessage = context?.formState?.errors?.root?.message

  return (
    <Theme name="red">
      <FieldError message={errorMessage} />
    </Theme>
  )
}
