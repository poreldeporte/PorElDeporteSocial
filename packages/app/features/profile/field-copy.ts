export const profileFieldCopy = {
  firstName: { label: 'First Name', placeholder: 'Lionel' },
  lastName: { label: 'Last Name', placeholder: 'Messi' },
  email: { label: 'Email', placeholder: 'lionel@gmail.com' },
  phone: { label: 'Phone', placeholder: '+1 305 555 1234' },
  password: { label: 'Password', placeholder: 'Choose a password' },
  address: { label: 'Address (optional)', placeholder: '123 NW 5th St, Miami' },
  birthDate: { label: 'Birth Date', placeholder: 'Select your birth date' },
  jerseyNumber: { label: 'Jersey Number', placeholder: '10' },
  position: { label: 'Preferred Position', placeholder: 'Midfield' },
} as const

type FieldKey = keyof typeof profileFieldCopy

export const describeProfileField = (key: FieldKey) => {
  const field = profileFieldCopy[key]
  return `${field.label} // ${field.placeholder}`
}
