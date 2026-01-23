export const profileFieldCopy = {
  firstName: { label: 'First name', placeholder: 'Alex' },
  lastName: { label: 'Last name', placeholder: 'Rivera' },
  email: { label: 'Email', placeholder: 'alex@email.com' },
  phone: { label: 'Phone', placeholder: '+1 (305) 555-1234' },
  password: { label: 'Password', placeholder: 'Choose a password' },
  address: { label: 'Address', placeholder: '123 Main St' },
  city: { label: 'City', placeholder: 'Miami' },
  state: { label: 'State', placeholder: 'Select state' },
  birthDate: { label: 'Birth date', placeholder: 'Select date' },
  jerseyNumber: { label: 'Jersey number', placeholder: '10' },
  position: { label: 'Positions', placeholder: 'Select one or more' },
  nationality: { label: 'Nationality', placeholder: 'Select country' },
} as const

type FieldKey = keyof typeof profileFieldCopy

export const describeProfileField = (key: FieldKey) => {
  const field = profileFieldCopy[key]
  return `${field.label} // ${field.placeholder}`
}
