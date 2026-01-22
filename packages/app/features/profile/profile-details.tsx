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
import {
  formatNationalityDisplay,
  formatPhoneDisplay,
  getPhoneCountryOptions,
  type PhoneCountryOption,
} from 'app/utils/phone'
import { CountryPicker } from 'app/components/CountryPicker'
import { useBrand } from 'app/provider/brand'

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
  const formatted = formatNationalityDisplay(value)
  return formatted || 'Add your nationality'
}

const DetailRow = ({
  label,
  value,
  isFirst,
  rightSlot,
  helper,
  alignTop,
}: {
  label: string
  value?: string
  isFirst?: boolean
  rightSlot?: ReactNode
  helper?: string
  alignTop?: boolean
}) => (
  <XStack
    px="$2"
    py="$2.5"
    gap="$3"
    ai={alignTop ? 'flex-start' : 'center'}
    borderTopWidth={isFirst ? 0 : 1}
    borderColor="$color4"
  >
    <Paragraph theme="alt2" size="$2" minWidth={120}>
      {label}
    </Paragraph>
    <YStack f={1} minWidth={0} gap={helper ? '$1' : 0}>
      {rightSlot ?? (
        <Paragraph fontWeight="600" flex={1}>
          {value}
        </Paragraph>
      )}
      {helper ? (
        <Paragraph theme="alt2" size="$2">
          {helper}
        </Paragraph>
      ) : null}
    </YStack>
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
  const { primaryColor } = useBrand()
  const cardBorder = isEditing ? primaryColor : '$color12'
  const sectionPadding = isEditing ? '$5' : '$4'
  const sectionGap = isEditing ? '$4' : '$3'

  return (
    <Card
      bordered
      animation="medium"
      scale={isEditing ? 1.01 : 1}
      y={isEditing ? -2 : 0}
      bw={1}
      boc={cardBorder}
      br="$5"
      p={0}
      overflow="hidden"
      backgroundColor="$color2"
    >
      <YStack p={sectionPadding} gap="$1" borderBottomWidth={1} borderBottomColor="$color12">
        <XStack ai="center" jc="space-between" flexWrap="wrap" gap="$2">
          <SizableText
            size="$5"
            fontWeight="600"
            textTransform="uppercase"
            letterSpacing={1.2}
            flexShrink={1}
            minWidth={0}
          >
            {title}
          </SizableText>
          {isEditing ? (
            <Paragraph theme="alt2" size="$2">
              Editing
            </Paragraph>
          ) : onEdit ? (
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
      </YStack>
      <YStack p={sectionPadding} gap={sectionGap} backgroundColor="$color1">
        <YStack animation="medium" y={isEditing ? 0 : 2}>
          {children}
        </YStack>
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
    <YStack gap={0}>
      <DetailRow
        label="Name"
        isFirst
        rightSlot={
          <XStack gap="$2" flex={1} minWidth={0}>
            <InlineInput
              placeholder={profileFieldCopy.firstName.placeholder}
              value={draft.firstName}
              onChangeText={(text) => onDraftChange({ firstName: text })}
              autoCapitalize="words"
            />
            <InlineInput
              placeholder={profileFieldCopy.lastName.placeholder}
              value={draft.lastName}
              onChangeText={(text) => onDraftChange({ lastName: text })}
              autoCapitalize="words"
            />
          </XStack>
        }
      />
      <DetailRow
        label={profileFieldCopy.email.label}
        rightSlot={
          <InlineInput
            placeholder={profileFieldCopy.email.placeholder}
            value={draft.email}
            onChangeText={(text) => onDraftChange({ email: text })}
            inputMode="email"
            autoCapitalize="none"
          />
        }
      />
      <DetailRow
        label={profileFieldCopy.phone.label}
        helper="Contact the club to change your phone number."
        alignTop
        rightSlot={
          <InlineInput
            placeholder={profileFieldCopy.phone.placeholder}
            value={draft.phone}
            onChangeText={(text) => onDraftChange({ phone: text })}
            inputMode="tel"
            disabled
          />
        }
      />
      <DetailRow
        label={profileFieldCopy.position.label}
        alignTop
        rightSlot={
          <InlinePositionEditor
            selected={draft.position}
            onChange={(position) => onDraftChange({ position })}
          />
        }
      />
      <DetailRow
        label={profileFieldCopy.jerseyNumber.label}
        rightSlot={
          <InlineInput
            placeholder={profileFieldCopy.jerseyNumber.placeholder}
            value={draft.jerseyNumber}
            onChangeText={(text) => onDraftChange({ jerseyNumber: normalizeDigits(text, 2) })}
            inputMode="numeric"
          />
        }
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
    <YStack gap={0}>
      <DetailRow
        label={profileFieldCopy.birthDate.label}
        isFirst
        rightSlot={
          <InlineBirthDateInputs
            value={draft.birthDate}
            onChange={(birthDate) => onDraftChange({ birthDate })}
          />
        }
      />
      <DetailRow
        label={profileFieldCopy.nationality.label}
        rightSlot={
          <InlineNationalityPicker
            value={draft.nationality}
            onChange={(nationality) => onDraftChange({ nationality })}
          />
        }
      />
      <DetailRow
        label={profileFieldCopy.address.label}
        rightSlot={
          <InlineInput
            placeholder={profileFieldCopy.address.placeholder}
            value={draft.address}
            onChangeText={(text) => onDraftChange({ address: text })}
          />
        }
      />
    </YStack>
  )
}

const inlineInputStyle = {
  borderWidth: 1,
  borderColor: '$color12',
  backgroundColor: '$white1',
  borderRadius: 0,
}

const InlineInput = ({
  placeholder,
  value,
  onChangeText,
  disabled,
  inputMode,
  autoCapitalize,
}: {
  placeholder?: string
  value: string
  onChangeText: (next: string) => void
  disabled?: boolean
  inputMode?: 'email' | 'tel' | 'numeric' | 'text'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}) => (
  <Input
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="$black9"
    disabled={disabled}
    inputMode={inputMode}
    autoCapitalize={autoCapitalize}
    size="$3"
    {...inlineInputStyle}
    textAlign="left"
    fontWeight="600"
    color="$color12"
    alignSelf="stretch"
    flex={1}
  />
)

const InlineBirthDateInputs = ({
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
    <XStack gap="$2" w="100%" alignSelf="stretch">
      <Input
        flex={1}
        minWidth={0}
        placeholder="MM"
        placeholderTextColor="$black9"
        inputMode="numeric"
        keyboardType="number-pad"
        maxLength={2}
        value={current.month}
        onChangeText={(text) => update('month', text, 2)}
        textAlign="left"
        size="$3"
        {...inlineInputStyle}
        fontWeight="600"
        color="$color12"
      />
      <Input
        flex={1}
        minWidth={0}
        placeholder="DD"
        placeholderTextColor="$black9"
        inputMode="numeric"
        keyboardType="number-pad"
        maxLength={2}
        value={current.day}
        onChangeText={(text) => update('day', text, 2)}
        textAlign="left"
        size="$3"
        {...inlineInputStyle}
        fontWeight="600"
        color="$color12"
      />
      <Input
        flex={1.4}
        minWidth={0}
        placeholder="YYYY"
        placeholderTextColor="$black9"
        inputMode="numeric"
        keyboardType="number-pad"
        maxLength={4}
        value={current.year}
        onChangeText={(text) => update('year', text, 4)}
        textAlign="left"
        size="$3"
        {...inlineInputStyle}
        fontWeight="600"
        color="$color12"
      />
    </XStack>
  )
}

const InlineNationalityPicker = ({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) => {
  const options = getPhoneCountryOptions()
  const selected = value ? options.find((option) => option.code === value) ?? null : null
  const triggerTextColor = selected ? '$color12' : '$black9'

  return (
    <XStack {...inlineInputStyle} px="$2" py="$1.5" w="100%" alignSelf="stretch" ai="center">
      <CountryPicker
        value={(value || null) as PhoneCountryOption['code'] | null}
        onChange={(code) => onChange(code)}
        selected={selected}
        options={options}
        variant="country"
        title="Select nationality"
        placeholder={profileFieldCopy.nationality.placeholder}
        popularCountries={['US', 'AR', 'BR', 'GB', 'DE', 'ES']}
        triggerTextColor={triggerTextColor}
        triggerIconColor="$color12"
      />
    </XStack>
  )
}

const InlinePositionEditor = ({
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
    <YStack gap="$2">
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
  )
}

const normalizeDigits = (value: string, maxLength: number) =>
  value.replace(/\D/g, '').slice(0, maxLength)
