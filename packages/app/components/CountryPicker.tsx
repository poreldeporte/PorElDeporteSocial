import { useEffect, useMemo, useState } from 'react'

import {
  Button,
  Input,
  Paragraph,
  ScrollView,
  Sheet,
  SizableText,
  Text,
  XStack,
  YStack,
  type ColorTokens,
} from '@my/ui/public'
import { ChevronDown } from '@tamagui/lucide-icons'
import { BRAND_COLORS } from 'app/constants/colors'
import { type PhoneCountryOption } from 'app/utils/phone'

const PRIMARY_COLOR = BRAND_COLORS.primary
const DEFAULT_POPULAR_COUNTRIES: PhoneCountryOption['code'][] = ['US', 'CA', 'MX']

export type CountryPickerVariant = 'dial' | 'country'

type CountryPickerProps = {
  value: PhoneCountryOption['code'] | null
  onChange: (value: PhoneCountryOption['code']) => void
  selected?: PhoneCountryOption | null
  options: PhoneCountryOption[]
  disabled?: boolean
  variant?: CountryPickerVariant
  title?: string
  searchPlaceholder?: string
  placeholder?: string
  popularCountries?: PhoneCountryOption['code'][]
  showLabel?: boolean
  triggerTextColor?: ColorTokens | string
  triggerIconColor?: ColorTokens | string
}

export const CountryPicker = ({
  value,
  onChange,
  selected,
  options,
  disabled,
  variant = 'dial',
  title = 'Select country',
  searchPlaceholder = 'Search country',
  placeholder = 'Select country',
  popularCountries = DEFAULT_POPULAR_COUNTRIES,
  showLabel = true,
  triggerTextColor,
  triggerIconColor,
}: CountryPickerProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const selectedOption = selected ?? options.find((option) => option.code === value) ?? null
  const popularOptions = useMemo(
    () => options.filter((option) => popularCountries.includes(option.code)),
    [options, popularCountries]
  )
  const filteredOptions = useMemo(
    () => filterCountryOptions(options, normalizedQuery),
    [normalizedQuery, options]
  )
  const otherOptions = useMemo(() => {
    if (normalizedQuery) return filteredOptions
    return options.filter((option) => !popularCountries.includes(option.code))
  }, [filteredOptions, normalizedQuery, options, popularCountries])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const handleSelect = (code: PhoneCountryOption['code']) => {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  const isCountry = variant === 'country'
  const showDialCode = variant === 'dial'
  const triggerLabel = selectedOption
    ? showDialCode
      ? `+${selectedOption.callingCode}`
      : selectedOption.name
    : placeholder
  const iconColor = triggerIconColor ?? '$color10'

  return (
    <>
      <Button
        chromeless
        onPress={() => setOpen(true)}
        disabled={disabled}
        padding={0}
        flexShrink={0}
        alignSelf={isCountry ? 'stretch' : 'center'}
        width={isCountry ? '100%' : undefined}
        backgroundColor="transparent"
        pressStyle={{ opacity: 0.7 }}
      >
        <XStack
          ai="center"
          gap="$1"
          flex={isCountry ? 1 : undefined}
          justifyContent={isCountry ? 'space-between' : 'flex-start'}
        >
          <XStack ai="center" gap="$1" flexShrink={1} minWidth={0}>
            {selectedOption ? (
              <Text fontSize={17} color={triggerTextColor}>
                {selectedOption.flag}
              </Text>
            ) : null}
            {showLabel ? (
              <Text fontSize={17} fontWeight="700" color={triggerTextColor}>
                {triggerLabel}
              </Text>
            ) : null}
          </XStack>
          <ChevronDown size={16} color={iconColor} />
        </XStack>
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        modal
        snapPoints={[70]}
        snapPointsMode="percent"
        dismissOnSnapToBottom
        dismissOnOverlayPress
        animationConfig={{
          type: 'spring',
          damping: 20,
          mass: 1.2,
          stiffness: 250,
        }}
      >
        <Sheet.Overlay
          opacity={0.5}
          animation="lazy"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          zIndex={0}
        />
        <Sheet.Frame backgroundColor="$background">
          <YStack px="$4" pt="$4" pb="$3" gap="$3">
            <XStack ai="center" jc="space-between">
              <SizableText fontSize={20} fontWeight="700">
                {title}
              </SizableText>
              <Button chromeless size="$2" onPress={() => setOpen(false)} color={PRIMARY_COLOR}>
                Close
              </Button>
            </XStack>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor="$color10"
              autoCapitalize="none"
              autoCorrect={false}
              inputMode="search"
              borderRadius={12}
              borderColor="$borderColor"
              backgroundColor="$background"
              selectionColor={PRIMARY_COLOR}
              caretColor={PRIMARY_COLOR}
              color="$color"
            />
          </YStack>
          <ScrollView flex={1} showsVerticalScrollIndicator={false}>
            <YStack>
              {!normalizedQuery && popularOptions.length > 0 ? (
                <CountrySection
                  title="Popular"
                  options={popularOptions}
                  selected={value}
                  onSelect={handleSelect}
                  showCallingCode={showDialCode}
                />
              ) : null}
              <CountrySection
                title={normalizedQuery ? 'Results' : 'All countries'}
                options={otherOptions}
                selected={value}
                onSelect={handleSelect}
                showCallingCode={showDialCode}
              />
              {normalizedQuery && filteredOptions.length === 0 ? (
                <Paragraph theme="alt2" fontSize={14} textAlign="center" py="$4">
                  No matches found.
                </Paragraph>
              ) : null}
            </YStack>
          </ScrollView>
        </Sheet.Frame>
      </Sheet>
    </>
  )
}

type CountrySectionProps = {
  title: string
  options: PhoneCountryOption[]
  selected: PhoneCountryOption['code'] | null
  onSelect: (code: PhoneCountryOption['code']) => void
  showCallingCode: boolean
}

const CountrySection = ({
  title,
  options,
  selected,
  onSelect,
  showCallingCode,
}: CountrySectionProps) => {
  if (!options.length) return null
  return (
    <YStack>
      <Paragraph px="$4" py="$2" theme="alt2" fontSize={13} textTransform="uppercase">
        {title}
      </Paragraph>
      {options.map((option) => {
        const isSelected = option.code === selected
        return (
          <Button
            key={option.code}
            chromeless
            onPress={() => onSelect(option.code)}
            justifyContent="space-between"
            alignItems="center"
            px="$4"
            height={52}
            borderBottomWidth={1}
            borderColor="$borderColor"
            backgroundColor={isSelected ? '$backgroundPress' : 'transparent'}
          >
            <XStack ai="center" gap="$2" flex={1}>
              <Text fontSize={18}>{option.flag}</Text>
              <Text fontSize={16}>{option.name}</Text>
            </XStack>
            {showCallingCode ? (
              <Text fontSize={15} color="$color10">
                +{option.callingCode}
              </Text>
            ) : null}
          </Button>
        )
      })}
    </YStack>
  )
}

const filterCountryOptions = (options: PhoneCountryOption[], query: string) => {
  if (!query) return options
  const numericQuery = query.replace(/\D/g, '')
  return options.filter((option) => {
    const name = option.name.toLowerCase()
    const code = option.code.toLowerCase()
    const matchesCallingCode = numericQuery
      ? option.callingCode.includes(numericQuery)
      : option.callingCode.includes(query)
    return name.includes(query) || matchesCallingCode || code.includes(query)
  })
}
