import { Card, Paragraph, SizableText, XStack, YStack } from '@my/ui/public'

import { profileFieldCopy } from './field-copy'

type ProfileDetailsProps = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  birthDate?: string | null
  jerseyNumber?: number | null
  position?: string | null
}

const formatValue = (value?: string | null, fallback = 'Add info') => {
  if (!value) return fallback
  const trimmed = value.trim()
  return trimmed.length ? trimmed : fallback
}

const formatBirthDate = (value?: string | null) => {
  if (!value) return 'Add your birth date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Add your birth date'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatJerseyNumber = (value?: number | null) => {
  if (typeof value !== 'number') return 'Pick a number'
  return `#${value}`
}

const DetailRow = ({ label, value, isFirst }: { label: string; value: string; isFirst?: boolean }) => (
  <XStack
    px="$2"
    py="$2.5"
    gap="$3"
    ai="center"
    borderTopWidth={isFirst ? 0 : 1}
    borderColor="$color4"
  >
    <Paragraph theme="alt2" size="$2" minWidth={120}>
      {label}
    </Paragraph>
    <Paragraph fontWeight="600" flex={1}>
      {value}
    </Paragraph>
  </XStack>
)

const DetailsSection = ({
  title,
  items,
}: {
  title: string
  items: Array<{ label: string; value: string }>
}) => (
  <Card bordered $platform-native={{ borderWidth: 0 }} p="$4" gap="$3">
    <SizableText size="$5" fontWeight="600">
      {title}
    </SizableText>
    <YStack>
      {items.map((item, index) => (
        <DetailRow key={item.label} label={item.label} value={item.value} isFirst={index === 0} />
      ))}
    </YStack>
  </Card>
)

export const ProfileDetails = ({
  firstName,
  lastName,
  email,
  phone,
  address,
  birthDate,
  jerseyNumber,
  position,
}: ProfileDetailsProps) => {
  const essentials = [
    {
      label: 'Name',
      value: formatValue([firstName, lastName].filter(Boolean).join(' ').trim(), 'Add your name'),
    },
    { label: profileFieldCopy.email.label, value: formatValue(email, 'No email on file') },
    { label: profileFieldCopy.phone.label, value: formatValue(phone) },
    { label: profileFieldCopy.position.label, value: formatValue(position, 'Add your position') },
    { label: profileFieldCopy.jerseyNumber.label, value: formatJerseyNumber(jerseyNumber) },
  ]

  const background = [
    { label: profileFieldCopy.birthDate.label, value: formatBirthDate(birthDate) },
    { label: profileFieldCopy.address.label, value: formatValue(address, 'Add your address') },
  ]

  return (
    <YStack space="$3">
      <DetailsSection title="Essentials" items={essentials} />
      <DetailsSection title="Background" items={background} />
    </YStack>
  )
}
