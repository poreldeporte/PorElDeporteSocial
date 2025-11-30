import { formFields } from 'app/utils/SchemaForm'
import { z } from 'zod'

import { describeProfileField } from './field-copy'

export const POSITION_OPTIONS = ['Goalie', 'Defender', 'Midfielder', 'Attacker'] as const
export type PositionOption = (typeof POSITION_OPTIONS)[number]

const schemaFields = {
  firstName: formFields.text.min(1).describe(describeProfileField('firstName')),
  lastName: formFields.text.min(1).describe(describeProfileField('lastName')),
  email: formFields.text.email().describe(describeProfileField('email')),
  phone: formFields.text.min(1).describe(describeProfileField('phone')),
  password: formFields.text.min(6).describe(describeProfileField('password')),
  address: formFields.text.describe(describeProfileField('address')),
  birthDate: formFields.date.describe(describeProfileField('birthDate')),
  jerseyNumber: formFields.number
    .int()
    .min(1)
    .max(99)
    .describe(describeProfileField('jerseyNumber')),
  position: formFields.select
    .refine((value) => POSITION_OPTIONS.includes(value as PositionOption), {
      message: 'Select a position',
    })
    .describe(describeProfileField('position')),
  positionOptional: formFields.selectOptional
    .refine(
      (value) =>
        value === undefined || value === '' || POSITION_OPTIONS.includes(value as PositionOption),
      {
        message: 'Select a position',
      }
    )
    .describe(describeProfileField('position')),
}

export const signUpFieldSchema = z.object({
  firstName: schemaFields.firstName,
  lastName: schemaFields.lastName,
  email: schemaFields.email,
  phone: schemaFields.phone,
  password: schemaFields.password,
  birthDate: schemaFields.birthDate,
  jerseyNumber: schemaFields.jerseyNumber,
  position: schemaFields.position,
})

export type SignUpFieldValues = z.infer<typeof signUpFieldSchema>

export const profileUpdateFieldSchema = z.object({
  firstName: schemaFields.firstName,
  lastName: schemaFields.lastName,
  phone: schemaFields.phone,
  address: schemaFields.address.optional(),
  birthDate: schemaFields.birthDate,
  jerseyNumber: schemaFields.jerseyNumber,
  position: schemaFields.positionOptional,
})

export type ProfileUpdateFieldValues = z.infer<typeof profileUpdateFieldSchema>
