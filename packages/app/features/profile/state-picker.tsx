import { useEffect, useMemo, useState, type ComponentProps } from 'react'

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
  formInputStyle,
  type ColorTokens,
} from '@my/ui/public'
import { ChevronDown } from '@tamagui/lucide-icons'
import { useBrand } from 'app/provider/brand'

import { STATE_OPTIONS, type StateOption } from './us-states'

type StatePickerProps = {
  value: string | null
  onChange: (value: string) => void
  options?: StateOption[]
  disabled?: boolean
  title?: string
  searchPlaceholder?: string
  placeholder?: string
  popularStates?: string[]
  triggerTextColor?: ColorTokens | string
  triggerIconColor?: ColorTokens | string
  triggerProps?: Omit<ComponentProps<typeof Button>, 'onPress' | 'children'>
}

const DEFAULT_POPULAR_STATES = ['FL', 'CA', 'NY']

export const StatePicker = ({
  value,
  onChange,
  options = STATE_OPTIONS,
  disabled,
  title = 'Select state',
  searchPlaceholder = 'Search state',
  placeholder = 'Select state',
  popularStates = DEFAULT_POPULAR_STATES,
  triggerProps,
  triggerTextColor,
  triggerIconColor,
}: StatePickerProps) => {
  const { primaryColor } = useBrand()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const selectedOption = options.find((option) => option.code === value) ?? null
  const popularOptions = useMemo(
    () => options.filter((option) => popularStates.includes(option.code)),
    [options, popularStates]
  )
  const filteredOptions = useMemo(
    () => filterStateOptions(options, normalizedQuery),
    [normalizedQuery, options]
  )
  const otherOptions = useMemo(() => {
    if (normalizedQuery) return filteredOptions
    return options.filter((option) => !popularStates.includes(option.code))
  }, [filteredOptions, normalizedQuery, options, popularStates])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const handleSelect = (code: string) => {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  const triggerLabel = selectedOption ? selectedOption.name : placeholder
  const iconColor = triggerIconColor ?? '$color10'

  return (
    <>
      <Button
        chromeless
        onPress={() => setOpen(true)}
        disabled={disabled}
        padding={0}
        width="100%"
        alignSelf="stretch"
        backgroundColor="transparent"
        pressStyle={{ opacity: 0.7 }}
        {...triggerProps}
      >
        <XStack ai="center" gap="$1" flex={1} justifyContent="space-between">
          <Text fontSize={17} fontWeight="700" color={triggerTextColor}>
            {triggerLabel}
          </Text>
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
        <Sheet.Frame backgroundColor="$background" borderColor="$color12" borderWidth={1}>
          <YStack px="$4" pt="$4" pb="$3" gap="$3">
            <XStack ai="center" jc="space-between">
              <SizableText fontSize={20} fontWeight="700">
                {title}
              </SizableText>
              <Button chromeless size="$2" onPress={() => setOpen(false)} color={primaryColor}>
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
              {...formInputStyle}
              selectionColor={primaryColor}
              caretColor={primaryColor}
              color="$color"
            />
          </YStack>
          <ScrollView flex={1} showsVerticalScrollIndicator={false}>
            <YStack>
              {!normalizedQuery && popularOptions.length ? (
                <StateSection
                  title="Popular"
                  options={popularOptions}
                  selected={value}
                  onSelect={handleSelect}
                />
              ) : null}
              <StateSection
                title={normalizedQuery ? 'Results' : 'All states'}
                options={otherOptions}
                selected={value}
                onSelect={handleSelect}
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

type StateSectionProps = {
  title: string
  options: StateOption[]
  selected: string | null
  onSelect: (code: string) => void
}

const StateSection = ({ title, options, selected, onSelect }: StateSectionProps) => {
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
            <Text fontSize={16}>{option.name}</Text>
          </Button>
        )
      })}
    </YStack>
  )
}

const filterStateOptions = (options: StateOption[], query: string) => {
  if (!query) return options
  return options.filter((option) => {
    const name = option.name.toLowerCase()
    const code = option.code.toLowerCase()
    return name.includes(query) || code.includes(query)
  })
}
