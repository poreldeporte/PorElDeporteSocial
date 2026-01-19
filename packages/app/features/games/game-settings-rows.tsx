import { Children, Fragment, type ReactNode } from 'react'

import { useController, useFormContext, type FieldValues, type Path } from 'react-hook-form'
import {
  Adapt,
  FieldError,
  Input,
  Paragraph,
  Select,
  Separator,
  Sheet,
  SizableText,
  Switch,
  XStack,
  YStack,
} from '@my/ui/public'
import { Check, ChevronDown } from '@tamagui/lucide-icons'
import { LinearGradient } from 'tamagui/linear-gradient'

import { BRAND_COLORS } from 'app/constants/colors'
import { DatePickerExample } from '@my/ui/src/components/elements/datepicker/DatePicker'

const SECTION_LETTER_SPACING = 1.6

type SelectOption = {
  value: string
  name: string
}

export const SettingSection = ({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: ReactNode
}) => {
  return (
    <YStack gap="$3">
      <YStack gap="$1">
        <SizableText
          size="$2"
          fontWeight="700"
          color="$color10"
          letterSpacing={SECTION_LETTER_SPACING}
        >
          {title.toUpperCase()}
        </SizableText>
        {note ? (
          <Paragraph theme="alt2" size="$2">
            {note}
          </Paragraph>
        ) : null}
      </YStack>
      <SettingRowGroup>{children}</SettingRowGroup>
    </YStack>
  )
}

const SettingRowGroup = ({ children }: { children: ReactNode }) => {
  const rows = Children.toArray(children).filter(Boolean)
  return (
    <YStack>
      {rows.map((row, index) => (
        <Fragment key={`row-${index}`}>
          {row}
          {index < rows.length - 1 ? <Separator bw="$0.5" boc="$color4" /> : null}
        </Fragment>
      ))}
    </YStack>
  )
}

const SettingRow = ({
  label,
  children,
  error,
}: {
  label: string
  children: ReactNode
  error?: string
}) => {
  return (
    <YStack>
      <XStack ai="center" jc="space-between" minHeight={60} py="$2" gap="$3">
        <SizableText size="$4" fontWeight="600" color="$color" flex={1} numberOfLines={2}>
          {label}
        </SizableText>
        {children}
      </XStack>
      <FieldError message={error} />
    </YStack>
  )
}

export const SettingRowSwitch = <T extends FieldValues>({
  name,
  label,
}: {
  name: Path<T>
  label: string
}) => {
  const { control, formState } = useFormContext<T>()
  const { field, fieldState } = useController({ control, name })
  const disabled = formState.isSubmitting
  const checked = Boolean(field.value)

  return (
    <SettingRowToggle
      label={label}
      checked={checked}
      disabled={disabled}
      error={fieldState.error?.message}
      onCheckedChange={(next) => field.onChange(next)}
    />
  )
}

export const SettingRowToggle = ({
  label,
  checked,
  disabled,
  error,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  error?: string
  onCheckedChange: (next: boolean) => void
}) => {
  return (
    <SettingRow label={label} error={error}>
      <Switch
        native
        size="$2"
        disabled={disabled}
        checked={checked}
        onCheckedChange={onCheckedChange}
        backgroundColor={checked ? BRAND_COLORS.primary : '$color5'}
        borderColor={checked ? BRAND_COLORS.primary : '$color6'}
        borderWidth={1}
        opacity={disabled ? 0.5 : 1}
      >
        <Switch.Thumb animation="100ms" />
      </Switch>
    </SettingRow>
  )
}

export const SettingRowText = <T extends FieldValues>({
  name,
  label,
  placeholder,
  width = 200,
  disabled: disabledOverride = false,
  autoCapitalize,
  autoCorrect,
}: {
  name: Path<T>
  label: string
  placeholder?: string
  width?: number
  disabled?: boolean
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoCorrect?: boolean
}) => {
  const { control, formState } = useFormContext<T>()
  const { field, fieldState } = useController({ control, name })
  const disabled = formState.isSubmitting || disabledOverride
  const value = typeof field.value === 'string' ? field.value : ''

  return (
    <SettingRow label={label} error={fieldState.error?.message}>
      <Input
        value={value}
        onChangeText={(text) => field.onChange(text)}
        onBlur={field.onBlur}
        placeholder={placeholder}
        placeholderTextColor="$color10"
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        disabled={disabled}
        textAlign="right"
        width={width}
        maxWidth="60%"
        fontSize={15}
        color="$color"
        borderWidth={0}
        backgroundColor="transparent"
        px={0}
        py={0}
        opacity={disabled ? 0.6 : 1}
      />
    </SettingRow>
  )
}

export const SettingRowNumber = <T extends FieldValues>({
  name,
  label,
  placeholder,
  width = 90,
}: {
  name: Path<T>
  label: string
  placeholder?: string
  width?: number
}) => {
  const { control, formState } = useFormContext<T>()
  const { field, fieldState } = useController({ control, name })
  const disabled = formState.isSubmitting
  const value = typeof field.value === 'number' ? String(field.value) : ''

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, '')
    if (!cleaned) {
      field.onChange(undefined)
      return
    }
    const next = Number(cleaned)
    if (Number.isNaN(next)) return
    field.onChange(next)
  }

  return (
    <SettingRow label={label} error={fieldState.error?.message}>
      <Input
        value={value}
        onChangeText={handleChange}
        onBlur={field.onBlur}
        placeholder={placeholder}
        placeholderTextColor="$color10"
        inputMode="numeric"
        keyboardType="number-pad"
        disabled={disabled}
        textAlign="right"
        width={width}
        fontSize={15}
        color="$color"
        borderWidth={0}
        backgroundColor="transparent"
        px={0}
        py={0}
        opacity={disabled ? 0.6 : 1}
      />
    </SettingRow>
  )
}

export const SettingRowSelect = <T extends FieldValues>({
  name,
  label,
  options,
  placeholder,
  width = 160,
  disabled: disabledOverride = false,
}: {
  name: Path<T>
  label: string
  options: SelectOption[]
  placeholder?: string
  width?: number
  disabled?: boolean
}) => {
  const { control, formState } = useFormContext<T>()
  const { field, fieldState } = useController({ control, name })
  const disabled = formState.isSubmitting || disabledOverride
  const value = typeof field.value === 'string' ? field.value : ''
  const useExpandedSheet = options.length > 12

  return (
    <SettingRow label={label} error={fieldState.error?.message}>
      <Select
        value={value}
        onValueChange={(next) => field.onChange(next)}
        disablePreventBodyScroll
        native
      >
        <Select.Trigger
          disabled={disabled}
          minWidth={width}
          maxWidth="60%"
          backgroundColor="transparent"
          borderWidth={0}
          px={0}
          py={0}
          jc="flex-end"
          opacity={disabled ? 0.6 : 1}
        >
          <Select.Value placeholder={placeholder} textAlign="right" />
        </Select.Trigger>

        <SelectSheetAdapter
          native
          snapPointsMode={useExpandedSheet ? 'percent' : 'fit'}
          snapPoints={useExpandedSheet ? [85] : undefined}
        />
        <Select.Content>
          <SelectOptions items={options} label={label} />
        </Select.Content>
      </Select>
    </SettingRow>
  )
}

export const SettingRowDate = <T extends FieldValues>({
  name,
  label,
  width = 160,
}: {
  name: Path<T>
  label: string
  width?: number
}) => {
  const { control, formState } = useFormContext<T>()
  const { field, fieldState } = useController({ control, name })
  const disabled = formState.isSubmitting
  const value = field.value as { dateValue?: Date } | undefined
  const safeDateValue =
    value?.dateValue && Number.isFinite(value.dateValue.getTime()) ? value.dateValue : undefined
  const errorMessage =
    (fieldState.error as { dateValue?: { message?: string } } | undefined)?.dateValue?.message ??
    fieldState.error?.message

  return (
    <SettingRow label={label} error={errorMessage}>
      <YStack width={width} maxWidth="60%">
        <DatePickerExample
          disabled={disabled}
          value={safeDateValue ? safeDateValue.toISOString() : undefined}
          onChangeText={(dateValue) => {
            if (!dateValue) {
              field.onChange({ ...(value ?? {}), dateValue: undefined })
              return
            }
            const next = new Date(dateValue)
            if (!Number.isFinite(next.getTime())) {
              field.onChange({ ...(value ?? {}), dateValue: undefined })
              return
            }
            field.onChange({ ...(value ?? {}), dateValue: next })
          }}
          onBlur={field.onBlur}
          id={`date-${String(name)}`}
        />
      </YStack>
    </SettingRow>
  )
}

const SelectSheetAdapter = ({
  native,
  snapPointsMode = 'fit',
  snapPoints,
}: {
  native: boolean
  snapPointsMode?: 'fit' | 'percent'
  snapPoints?: number[]
}) => (
  <Adapt when="sm" platform="touch">
    <Sheet
      zIndex={1000}
      native={native}
      dismissOnSnapToBottom
      modal
      animationConfig={{
        type: 'spring',
        damping: 20,
        mass: 1.2,
        stiffness: 250,
      }}
      snapPointsMode={snapPointsMode}
      snapPoints={snapPoints}
    >
      <Sheet.Frame marginBottom="$12">
        <Sheet.ScrollView>
          <Adapt.Contents />
        </Sheet.ScrollView>
      </Sheet.Frame>
      <Sheet.Overlay
        opacity={0.5}
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        zIndex={0}
      />
    </Sheet>
  </Adapt>
)

const SelectOptions = ({ items, label }: { items: SelectOption[]; label?: string }) => (
  <>
    <Select.Viewport minWidth={200}>
      <Select.Group>
        <Select.Label>{label ?? 'Options'}</Select.Label>
        {items.map((item, index) => (
          <Select.Item index={index} key={item.value} value={item.value}>
            <Select.ItemText>{item.name}</Select.ItemText>
            <Select.ItemIndicator marginLeft="auto">
              <Check size={16} />
            </Select.ItemIndicator>
          </Select.Item>
        ))}
      </Select.Group>
    </Select.Viewport>
    <Select.ScrollDownButton
      alignItems="center"
      justifyContent="center"
      position="relative"
      width="100%"
      height="$3"
    >
      <YStack zIndex={10}>
        <ChevronDown size={20} />
      </YStack>
      <LinearGradient
        start={[0, 0]}
        end={[0, 1]}
        fullscreen
        colors={['transparent', '$background']}
        borderRadius="$4"
      />
    </Select.ScrollDownButton>
  </>
)
