import { formFields } from 'app/utils/SchemaForm'
import { z } from 'zod'

import { describeProfileField } from './field-copy'

export const POSITION_OPTIONS = ['Goalie', 'Defender', 'Midfielder', 'Attacker'] as const
export type PositionOption = (typeof POSITION_OPTIONS)[number]

const schemaFields = {
  firstName: formFields.text
    .min(1, 'First name is required')
    .describe(describeProfileField('firstName')),
  lastName: formFields.text
    .min(1, 'Last name is required')
    .describe(describeProfileField('lastName')),
  email: formFields.text
    .min(1, 'Email is required')
    .email('Enter a valid email')
    .describe(describeProfileField('email')),
  phone: formFields.text
    .min(1, 'Phone number is required')
    .describe(describeProfileField('phone')),
  password: formFields.text
    .min(6, 'Password must be at least 6 characters')
    .describe(describeProfileField('password')),
  address: formFields.text.describe(describeProfileField('address')),
  nationality: formFields.text.optional().describe(describeProfileField('nationality')),
  birthDate: formFields.birthDate.describe(describeProfileField('birthDate')),
  jerseyNumber: formFields.number
    .int()
    .min(1, 'Jersey number must be between 1 and 99')
    .max(99, 'Jersey number must be between 1 and 99')
    .describe(describeProfileField('jerseyNumber')),
  position: formFields.selectMulti.describe(describeProfileField('position')),
  positionOptional: formFields.selectMulti
    .optional()
    .describe(describeProfileField('position')),
}

const requirePositionSelection = <T extends { position: string[] }>(schema: z.ZodType<T>) =>
  schema.superRefine((data, ctx) => {
    if (data.position.length > 0) return
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['position'],
      message: 'Select at least one position',
    })
  })

export const signUpFieldSchema = requirePositionSelection(z.object({
  firstName: schemaFields.firstName,
  lastName: schemaFields.lastName,
  email: schemaFields.email,
  phone: schemaFields.phone,
  password: schemaFields.password,
  birthDate: schemaFields.birthDate,
  jerseyNumber: schemaFields.jerseyNumber,
  position: schemaFields.position,
}))

export type SignUpFieldValues = z.infer<typeof signUpFieldSchema>

export const profileUpdateFieldSchema = requirePositionSelection(z.object({
  firstName: schemaFields.firstName,
  lastName: schemaFields.lastName,
  email: schemaFields.email,
  phone: schemaFields.phone,
  address: schemaFields.address.optional(),
  nationality: schemaFields.nationality,
  birthDate: schemaFields.birthDate,
  jerseyNumber: schemaFields.jerseyNumber,
  position: schemaFields.position,
}))

export type ProfileUpdateFieldValues = z.infer<typeof profileUpdateFieldSchema>
