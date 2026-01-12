import type { ReactNode } from 'react'
import { Button, Card, Checkbox, Input, Label, Paragraph, SizableText, XStack, YStack } from '@my/ui/public'
import { Check, PenSquare } from '@tamagui/lucide-icons'

import {
  emptyBirthDateParts,
  formatBirthDateParts,
  normalizeBirthDatePart,
  parseBirthDateParts,
  type BirthDateParts,
} from 'app/utils/birthDate'
import { formatPhoneDisplay, getPhoneCountryOptions, type PhoneCountryOption } from 'app/utils/phone'
import { CountryPicker } from 'app/components/CountryPicker'

import { profileFieldCopy } from './field-copy'
import { POSITION_OPTIONS } from './profile-field-schema'

export type ProfileEditSection = 'essentials' | 'background'

export type ProfileDraft = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  nationality: string
  birthDate: BirthDateParts
  jerseyNumber: string
  position: string[]
}

export type ProfileDetailsEditor = {
  draft: ProfileDraft
  activeSection: ProfileEditSection | null
  onSectionToggle: (section: ProfileEditSection) => void
  onDraftChange: (update: Partial<ProfileDraft>) => void
}

type ProfileDetailsProps = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  nationality?: string | null
  birthDate?: string | null
  jerseyNumber?: number | null
  position?: string | null
  editor?: ProfileDetailsEditor
}

const formatValue = (value?: string | null, fallback = 'Add info') => {
  if (!value) return fallback
  const trimmed = value.trim()
  return trimmed.length ? trimmed : fallback
}

const formatBirthDate = (value?: string | null) => {
  const parts = parseBirthDateParts(value)
  if (!parts) return 'Add your birth date'
  const year = Number(parts.year)
  const month = Number(parts.month)
  const day = Number(parts.day)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return 'Add your birth date'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatPhone = (value?: string | null, fallback = 'Add info') => {
  const formatted = formatPhoneDisplay(value)
  return formatted || fallback
}

const formatJerseyNumber = (value?: number | string | null) => {
  if (typeof value === 'number') return `#${value}`
  if (typeof value !== 'string') return 'Pick a number'
  const trimmed = value.trim()
  if (!trimmed) return 'Pick a number'
  const parsed = Number(trimmed)
  if (Number.isNaN(parsed)) return 'Pick a number'
  return `#${parsed}`
}

const formatNationality = (value?: string | null) => {
  if (!value) return 'Add your nationality'
  const option = getPhoneCountryOptions().find((country) => country.code === value)
  if (!option) return value
  return `${option.flag} ${option.name}`
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

const DetailList = ({ items }: { items: Array<{ label: string; value: string }> }) => (
  <YStack>
    {items.map((item, index) => (
      <DetailRow key={item.label} label={item.label} value={item.value} isFirst={index === 0} />
    ))}
  </YStack>
)

const DetailsSection = ({
  title,
  children,
  onEdit,
  isEditing,
}: {
  title: string
  children: ReactNode
  onEdit?: () => void
  isEditing?: boolean
}) => {
  const cardBackground = isEditing ? '$color2' : '$background'
  const cardBorder = isEditing ? '$color6' : '$black1'

  return (
    <Card
      bordered
      animation="medium"
      scale={isEditing ? 1.01 : 1}
      y={isEditing ? -2 : 0}
      bw={1}
      boc={cardBorder}
      br="$5"
      p={isEditing ? '$5' : '$4'}
      gap={isEditing ? '$4' : '$3'}
      backgroundColor={cardBackground}
    >
      <XStack ai="center" jc="space-between">
        <SizableText size="$5" fontWeight="600">
          {title}
        </SizableText>
        {onEdit ? (
          <Button
            chromeless
            size="$2"
            circular
            icon={PenSquare}
            aria-label={`Edit ${title}`}
            onPress={onEdit}
            backgroundColor={isEditing ? '$color3' : 'transparent'}
            pressStyle={{ opacity: 0.7 }}
          />
        ) : null}
      </XStack>
      <YStack animation="medium" y={isEditing ? 0 : 2}>
        {children}
      </YStack>
    </Card>
  )
}

export const ProfileDetails = ({
  firstName,
  lastName,
  email,
  phone,
  address,
  nationality,
  birthDate,
  jerseyNumber,
  position,
  editor,
}: ProfileDetailsProps) => {
  const draft = editor?.draft
  const displayBirthDate = editor
    ? formatBirthDateParts(draft?.birthDate ?? emptyBirthDateParts())
    : birthDate
  const displayPosition = editor ? (draft?.position ?? []).join(', ') : position
  const displayJersey = editor ? draft?.jerseyNumber ?? '' : jerseyNumber
  const displayNationality = editor ? draft?.nationality ?? '' : nationality
  const displayAddress = editor ? draft?.address ?? '' : address
  const displayEmail = editor ? draft?.email ?? '' : email
  const displayPhone = editor ? draft?.phone ?? '' : phone
  const displayFirstName = editor ? draft?.firstName ?? '' : firstName
  const displayLastName = editor ? draft?.lastName ?? '' : lastName
  const isEditingEssentials = editor?.activeSection === 'essentials'
  const isEditingBackground = editor?.activeSection === 'background'

  const essentials = [
    {
      label: 'Name',
      value: formatValue(
        [displayFirstName, displayLastName].filter(Boolean).join(' ').trim(),
        'Add your name'
      ),
    },
    { label: profileFieldCopy.email.label, value: formatValue(displayEmail, 'No email on file') },
    { label: profileFieldCopy.phone.label, value: formatPhone(displayPhone) },
    {
      label: profileFieldCopy.position.label,
      value: formatValue(displayPosition, 'Add your position'),
    },
    { label: profileFieldCopy.jerseyNumber.label, value: formatJerseyNumber(displayJersey) },
  ]

  const background = [
    { label: profileFieldCopy.birthDate.label, value: formatBirthDate(displayBirthDate) },
    { label: profileFieldCopy.nationality.label, value: formatNationality(displayNationality) },
    { label: profileFieldCopy.address.label, value: formatValue(displayAddress, 'Add your address') },
  ]

  return (
    <YStack space="$3">
      <DetailsSection
        title="Essentials"
        isEditing={isEditingEssentials}
        onEdit={editor ? () => editor.onSectionToggle('essentials') : undefined}
      >
        {isEditingEssentials && editor ? (
          <EssentialsEditor draft={editor.draft} onDraftChange={editor.onDraftChange} />
        ) : (
          <DetailList items={essentials} />
        )}
      </DetailsSection>
      <DetailsSection
        title="Background"
        isEditing={isEditingBackground}
        onEdit={editor ? () => editor.onSectionToggle('background') : undefined}
      >
        {isEditingBackground && editor ? (
          <BackgroundEditor draft={editor.draft} onDraftChange={editor.onDraftChange} />
        ) : (
          <DetailList items={background} />
        )}
      </DetailsSection>
    </YStack>
  )
}

const EssentialsEditor = ({
  draft,
  onDraftChange,
}: {
  draft: ProfileDraft
  onDraftChange: (update: Partial<ProfileDraft>) => void
}) => {
  return (
    <YStack gap="$4">
      <XStack gap="$3" $sm={{ fd: 'column' }}>
        <InputField
          label={profileFieldCopy.firstName.label}
          placeholder={profileFieldCopy.firstName.placeholder}
          value={draft.firstName}
          onChangeText={(text) => onDraftChange({ firstName: text })}
          autoCapitalize="words"
        />
        <InputField
          label={profileFieldCopy.lastName.label}
          placeholder={profileFieldCopy.lastName.placeholder}
          value={draft.lastName}
          onChangeText={(text) => onDraftChange({ lastName: text })}
          autoCapitalize="words"
        />
      </XStack>
      <InputField
        label={profileFieldCopy.email.label}
        placeholder={profileFieldCopy.email.placeholder}
        value={draft.email}
        onChangeText={(text) => onDraftChange({ email: text })}
        inputMode="email"
        autoCapitalize="none"
      />
      <InputField
        label={profileFieldCopy.phone.label}
        placeholder={profileFieldCopy.phone.placeholder}
        value={draft.phone}
        onChangeText={(text) => onDraftChange({ phone: text })}
        inputMode="tel"
        disabled
        helper="Contact the club to change your phone number."
      />
      <PositionEditor selected={draft.position} onChange={(position) => onDraftChange({ position })} />
      <InputField
        label={profileFieldCopy.jerseyNumber.label}
        placeholder={profileFieldCopy.jerseyNumber.placeholder}
        value={draft.jerseyNumber}
        onChangeText={(text) => onDraftChange({ jerseyNumber: normalizeDigits(text, 2) })}
        inputMode="numeric"
      />
    </YStack>
  )
}

const BackgroundEditor = ({
  draft,
  onDraftChange,
}: {
  draft: ProfileDraft
  onDraftChange: (update: Partial<ProfileDraft>) => void
}) => {
  return (
    <YStack gap="$4">
      <BirthDateInputs
        value={draft.birthDate}
        onChange={(birthDate) => onDraftChange({ birthDate })}
      />
      <NationalityPicker
        value={draft.nationality}
        onChange={(nationality) => onDraftChange({ nationality })}
      />
      <InputField
        label={profileFieldCopy.address.label}
        placeholder={profileFieldCopy.address.placeholder}
        value={draft.address}
        onChangeText={(text) => onDraftChange({ address: text })}
      />
    </YStack>
  )
}

const InputField = ({
  label,
  placeholder,
  value,
  onChangeText,
  disabled,
  helper,
  inputMode,
  autoCapitalize,
}: {
  label: string
  placeholder?: string
  value: string
  onChangeText: (next: string) => void
  disabled?: boolean
  helper?: string
  inputMode?: 'email' | 'tel' | 'numeric' | 'text'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}) => (
  <YStack gap="$3" flex={1}>
    <Label theme="alt1" size="$3">
      {label}
    </Label>
    <Input
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="$color10"
      disabled={disabled}
      inputMode={inputMode}
      autoCapitalize={autoCapitalize}
      size="$4"
      br="$4"
      backgroundColor="$color1"
      borderColor="$color5"
    />
    {helper ? (
      <Paragraph theme="alt2" size="$2">
        {helper}
      </Paragraph>
    ) : null}
  </YStack>
)

const BirthDateInputs = ({
  value,
  onChange,
}: {
  value: BirthDateParts
  onChange: (next: BirthDateParts) => void
}) => {
  const current = value ?? emptyBirthDateParts()
  const update = (key: keyof BirthDateParts, nextValue: string, maxLength: number) => {
    const normalized = normalizeBirthDatePart(nextValue, maxLength)
    onChange({ ...current, [key]: normalized })
  }

  return (
    <YStack gap="$3">
      <Label theme="alt1" size="$3">
        {profileFieldCopy.birthDate.label}
      </Label>
      <XStack gap="$3">
        <Input
          w={72}
          placeholder="MM"
          placeholderTextColor="$color10"
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={2}
          value={current.month}
          onChangeText={(text) => update('month', text, 2)}
          textAlign="center"
          size="$4"
          br="$4"
          backgroundColor="$color1"
          borderColor="$color5"
        />
        <Input
          w={72}
          placeholder="DD"
          placeholderTextColor="$color10"
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={2}
          value={current.day}
          onChangeText={(text) => update('day', text, 2)}
          textAlign="center"
          size="$4"
          br="$4"
          backgroundColor="$color1"
          borderColor="$color5"
        />
        <Input
          w={96}
          placeholder="YYYY"
          placeholderTextColor="$color10"
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={4}
          value={current.year}
          onChangeText={(text) => update('year', text, 4)}
          textAlign="center"
          size="$4"
          br="$4"
          backgroundColor="$color1"
          borderColor="$color5"
        />
      </XStack>
    </YStack>
  )
}

const NationalityPicker = ({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) => {
  const options = getPhoneCountryOptions()
  const selected = value ? options.find((option) => option.code === value) ?? null : null

  return (
    <YStack gap="$3">
      <Label theme="alt1" size="$3">
        Nationality (Optional)
      </Label>
      <YStack
        borderWidth={1}
        borderColor="$color5"
        borderRadius="$4"
        backgroundColor="$color1"
        px="$3"
        py="$2"
      >
        <CountryPicker
          value={(value || null) as PhoneCountryOption['code'] | null}
          onChange={(code) => onChange(code)}
          selected={selected}
          options={options}
          variant="country"
          title="Select nationality"
          placeholder={profileFieldCopy.nationality.placeholder}
          popularCountries={['US', 'AR', 'BR', 'GB', 'DE', 'ES']}
        />
      </YStack>
    </YStack>
  )
}

const PositionEditor = ({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) => {
  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange(next)
  }

  return (
    <YStack gap="$3">
      <Label theme="alt1" size="$3">
        {profileFieldCopy.position.label}
      </Label>
      <YStack gap="$3">
        {POSITION_OPTIONS.map((option) => (
          <XStack key={option} ai="center" gap="$3">
            <Checkbox
              checked={selected.includes(option)}
              onCheckedChange={() => toggle(option)}
              id={`position-edit-${option}`}
              size="$3"
            >
              <Checkbox.Indicator>
                <Check size={12} />
              </Checkbox.Indicator>
            </Checkbox>
            <Label htmlFor={`position-edit-${option}`} onPress={() => toggle(option)}>
              {option}
            </Label>
          </XStack>
        ))}
      </YStack>
    </YStack>
  )
}

const normalizeDigits = (value: string, maxLength: number) =>
  value.replace(/\D/g, '').slice(0, maxLength)
