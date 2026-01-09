import type { ComponentProps } from 'react'
import { useMemo, useRef } from 'react'

import { Input, Text, YStack } from '@my/ui/public'
import { normalizePhoneDigits } from 'app/utils/phone'

type UsPhoneMaskInputProps = {
  value: string
  onChange: (digits: string) => void
  onBlur?: () => void
  onFocus?: () => void
  disabled?: boolean
  autoFocus?: boolean
  placeholderChar?: string
  textProps?: ComponentProps<typeof Text>
  inputProps?: Partial<ComponentProps<typeof Input>>
}

const buildMask = (digits: string, placeholderChar: string) => {
  const spacer = '  '
  const slots = Array.from({ length: 10 }, (_, index) => digits[index] ?? placeholderChar)
  const joinSlots = (chunk: string[]) => {
    let out = ''
    for (let i = 0; i < chunk.length; i += 1) {
      const char = chunk[i]
      out += char
      if (char === placeholderChar && chunk[i + 1] === placeholderChar) out += spacer
    }
    return out
  }

  const areaSlots = slots.slice(0, 3)
  const prefixSlots = slots.slice(3, 6)
  const lineSlots = slots.slice(6)
  const area = joinSlots(areaSlots)
  const prefix = joinSlots(prefixSlots)
  const line = joinSlots(lineSlots)
  const areaLeftSpace = areaSlots[0] === placeholderChar ? spacer : ''
  const areaRightSpace = areaSlots[areaSlots.length - 1] === placeholderChar ? spacer : ''
  const prefixLeftSpace = prefixSlots[0] === placeholderChar ? spacer : ''
  const dashLeftSpace = prefixSlots[prefixSlots.length - 1] === placeholderChar ? spacer : ''
  const dashRightSpace = lineSlots[0] === placeholderChar ? spacer : ''
  return `(${areaLeftSpace}${area}${areaRightSpace})${prefixLeftSpace}${prefix}${dashLeftSpace}-${dashRightSpace}${line}`
}

export const UsPhoneMaskInput = ({
  value,
  onChange,
  onBlur,
  onFocus,
  disabled,
  autoFocus,
  placeholderChar = '·',
  textProps,
  inputProps,
}: UsPhoneMaskInputProps) => {
  const inputRef = useRef<{ focus?: () => void } | null>(null)
  const digits = normalizePhoneDigits(value, 'US')
  const mask = useMemo(() => buildMask(digits, placeholderChar), [digits, placeholderChar])

  const handleChange = (text: string) => {
    const next = normalizePhoneDigits(text, 'US')
    if (next !== value) onChange(next)
  }

  const focusInput = () => {
    if (disabled) return
    inputRef.current?.focus?.()
  }

  return (
    <YStack f={1} position="relative" onPress={focusInput}>
      <Text {...textProps}>{mask}</Text>
      <Input
        ref={inputRef}
        value={digits}
        onChangeText={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        autoFocus={autoFocus}
        autoComplete="tel"
        suppressHydrationWarning
        textContentType="telephoneNumber"
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={10}
        disabled={disabled}
        caretHidden
        opacity={0}
        position="absolute"
        width="100%"
        height="100%"
        borderWidth={0}
        backgroundColor="transparent"
        px={0}
        py={0}
        accessibilityLabel="Phone number"
        {...inputProps}
      />
    </YStack>
  )
}
