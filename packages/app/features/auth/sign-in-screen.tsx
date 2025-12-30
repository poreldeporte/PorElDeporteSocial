import {
  Button,
  FieldError,
  FormWrapper,
  H2,
  Input,
  Link,
  LoadingOverlay,
  Paragraph,
  ScrollView,
  Sheet,
  SizableText,
  Text,
  XStack,
  YStack,
} from '@my/ui/public'
import { ChevronDown } from '@tamagui/lucide-icons'
import { pedLogo } from 'app/assets'
import { BRAND_COLORS } from 'app/constants/colors'
import { PROFILE_APPROVAL_FIELDS, isProfileApproved } from 'app/utils/auth/profileApproval'
import { PROFILE_COMPLETION_FIELDS, isProfileComplete } from 'app/utils/auth/profileCompletion'
import {
  formatE164ForDisplay,
  formatPhoneInput,
  getPhoneCountryOptions,
  parsePhoneToE164,
  type PhoneCountryOption,
} from 'app/utils/phone'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { SolitoImage } from 'solito/image'
import { useRouter } from 'solito/router'

const RESEND_SECONDS = 30
const DEFAULT_COUNTRY: PhoneCountryOption['code'] = 'US'
const POPULAR_COUNTRIES: PhoneCountryOption['code'][] = ['US', 'MX', 'CA']
const PRIMARY_COLOR = BRAND_COLORS.primary

type PhoneValues = {
  phone: string
}

type CodeValues = {
  code: string
}

type PhoneAuthScreenProps = {
  title: string
  subtitle: string
}

export const PhoneAuthScreen = ({ title, subtitle }: PhoneAuthScreenProps) => {
  const supabase = useSupabase()
  const router = useRouter()
  const { isLoadingSession } = useUser()
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'sending' | 'verifying'>('idle')
  const [country, setCountry] = useState<PhoneCountryOption['code']>(DEFAULT_COUNTRY)
  const [resendSeconds, setResendSeconds] = useState(0)
  const phoneForm = useForm<PhoneValues>({ defaultValues: { phone: '' } })
  const codeForm = useForm<CodeValues>({ defaultValues: { code: '' } })
  const countryOptions = getPhoneCountryOptions()
  const selectedCountry =
    countryOptions.find((option) => option.code === country) ?? countryOptions[0]
  const phoneValue = phoneForm.watch('phone')
  const codeValue = codeForm.watch('code')
  const codeDigits = codeValue?.replace(/\D/g, '') ?? ''
  const isPhoneValid = useMemo(
    () => Boolean(parsePhoneToE164(phoneValue ?? '', country)),
    [country, phoneValue]
  )

  useEffect(() => {
    if (!phoneValue) return
    const formatted = formatPhoneInput(phoneValue, country)
    if (formatted !== phoneValue) phoneForm.setValue('phone', formatted)
  }, [country, phoneForm, phoneValue])

  useEffect(() => {
    if (step !== 'code' || resendSeconds <= 0) return
    const timer = setTimeout(() => {
      setResendSeconds((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    return () => clearTimeout(timer)
  }, [resendSeconds, step])

  useEffect(() => {
    if (step !== 'code') return
    codeForm.reset({ code: '' })
  }, [codeForm, step])

  const sendCode = async (rawPhone: string) => {
    const normalized = parsePhoneToE164(rawPhone, country)
    if (!normalized) {
      phoneForm.setError('phone', { type: 'custom', message: 'Enter a valid phone number.' })
      return
    }
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalized,
      options: { shouldCreateUser: true, channel: 'sms' },
    })
    setStatus('idle')
    if (error) {
      phoneForm.setError('phone', { type: 'custom', message: error.message })
      return
    }
    setPhone(normalized)
    codeForm.reset({ code: '' })
    setResendSeconds(RESEND_SECONDS)
    setStep('code')
  }

  const verifyCode = async (rawCode: string) => {
    if (!phone) {
      codeForm.setError('code', { type: 'custom', message: 'Enter your phone number first.' })
      setStep('phone')
      return
    }
    const token = rawCode.replace(/\D/g, '')
    if (token.length !== 6) {
      codeForm.setError('code', { type: 'custom', message: 'Enter the 6-digit code.' })
      return
    }
    setStatus('verifying')
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    })
    if (error) {
      setStatus('idle')
      codeForm.setError('code', { type: 'custom', message: formatOtpError(error.message) })
      return
    }
    if (!data.user?.id) {
      setStatus('idle')
      router.replace('/')
      return
    }
    const nextRoute = await resolvePostAuthRoute(supabase, data.user.id)
    router.replace(nextRoute)
  }

  const handleSendCode = phoneForm.handleSubmit(({ phone: rawPhone }) => sendCode(rawPhone))
  const handleVerifyCode = codeForm.handleSubmit(({ code }) => verifyCode(code))

  const resendCode = async () => {
    if (!phone || resendSeconds > 0) return
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true, channel: 'sms' },
    })
    setStatus('idle')
    if (error) {
      codeForm.setError('code', { type: 'custom', message: error.message })
      return
    }
    setResendSeconds(RESEND_SECONDS)
  }

  const resetToPhone = () => {
    codeForm.reset({ code: '' })
    setResendSeconds(0)
    setStep('phone')
  }

  const phoneDisplay = phone ? formatE164ForDisplay(phone) : 'your number'
  const contentPaddingTop = Math.max(insets.top, 24) + 24
  const submitDisabled = step === 'phone'
    ? status !== 'idle' || !isPhoneValid
    : status !== 'idle' || codeDigits.length < 6

  return (
    <YStack f={1} bg="$color1">
      <FormWrapper f={1} jc="space-between" gap="$0">
        <FormWrapper.Body p="$0">
          {step === 'phone' ? (
            <YStack key="phone-step" px="$6" gap="$5" ai="center" style={{ paddingTop: contentPaddingTop }}>
              <AuthHeader title={title} subtitle={subtitle} />
              <Controller
                control={phoneForm.control}
                name="phone"
                render={({ field, fieldState }) => (
                  <PhoneInputField
                    value={field.value}
                    onChange={(next) => {
                      field.onChange(next)
                      phoneForm.clearErrors('phone')
                    }}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    country={country}
                    onCountryChange={setCountry}
                    selectedCountry={selectedCountry}
                    options={countryOptions}
                    disabled={status !== 'idle'}
                  />
                )}
              />
            </YStack>
          ) : (
              <YStack key="code-step" px="$6" gap="$5" ai="center" style={{ paddingTop: contentPaddingTop }}>
                <AuthHeader
                  title="Confirm your number"
                  subtitle="Enter the 6-digit code we texted."
                />
                <Controller
                  control={codeForm.control}
                  name="code"
                  defaultValue=""
                render={({ field, fieldState }) => (
                  <OtpInputField
                    value={field.value}
                    onChange={(next) => {
                      field.onChange(next)
                      codeForm.clearErrors('code')
                    }}
                    onComplete={(next) => {
                      if (status === 'idle') verifyCode(next)
                    }}
                    error={fieldState.error?.message}
                      disabled={status !== 'idle'}
                    />
                  )}
                />
                <Paragraph fontSize={13} theme="alt2" textAlign="center">
                  Code sent to {phoneDisplay}.
                </Paragraph>
                <YStack gap="$2" ai="center">
                  <Button
                    chromeless
                    size="$2"
                  onPress={resendCode}
                  disabled={resendSeconds > 0 || status !== 'idle'}
                  color={resendSeconds > 0 ? '$color10' : PRIMARY_COLOR}
                >
                  {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Send new code'}
                </Button>
                <XStack ai="center" gap="$1">
                  <Paragraph fontSize={15} theme="alt2">
                    Not your number?
                  </Paragraph>
                  <Button chromeless size="$2" onPress={resetToPhone} color={PRIMARY_COLOR}>
                    Edit number
                  </Button>
                </XStack>
              </YStack>
            </YStack>
          )}
        </FormWrapper.Body>
        <FormWrapper.Footer pb="$6" px="$6">
          <Button
            backgroundColor="#000"
            borderColor={PRIMARY_COLOR}
            borderWidth={1}
            color="#fff"
            fontSize={17}
            fontWeight="600"
            height={50}
            borderRadius={12}
            w="100%"
            onPress={step === 'phone' ? handleSendCode : handleVerifyCode}
            disabled={submitDisabled}
            pressStyle={{ opacity: 0.85 }}
          >
            {step === 'phone'
              ? status === 'sending'
                ? 'Sending…'
                : 'Send code'
              : status === 'verifying'
                ? 'Verifying…'
                : 'Verify'}
          </Button>
          {step === 'phone' ? <TermsNotice /> : null}
        </FormWrapper.Footer>
        {(isLoadingSession || status !== 'idle') && <LoadingOverlay />}
      </FormWrapper>
    </YStack>
  )
}

export const SignInScreen = () => (
  <PhoneAuthScreen
    title="Invite-only."
    subtitle="Miami runs since 2014. Respect on the pitch, lifestyle off it. Verify your phone to enter. First time? New members are reviewed for access."
  />
)

type AuthHeaderProps = {
  title: string
  subtitle: string
}

const AuthHeader = ({ title, subtitle }: AuthHeaderProps) => (
  <YStack gap="$3" ai="flex-start" w="100%">
    <SolitoImage src={pedLogo} alt="Por El Deporte crest" width={56} height={56} />
    <H2 ta="left" fontWeight="700">
      {title}
    </H2>
    <Paragraph fontSize={17} color="$color" textAlign="left">
      {subtitle}
    </Paragraph>
  </YStack>
)

const TermsNotice = () => (
  <XStack gap="$1" jc="center" flexWrap="wrap">
    <SizableText fontSize={12} theme="alt2" textAlign="center">
      By continuing, you agree to the
    </SizableText>
    <Link href="/terms-of-service" textDecorationLine="underline" color={PRIMARY_COLOR} fontSize={12}>
      Terms
    </Link>
    <SizableText fontSize={12} theme="alt2" textAlign="center">
      and
    </SizableText>
    <Link href="/privacy-policy" textDecorationLine="underline" color={PRIMARY_COLOR} fontSize={12}>
      Privacy Policy.
    </Link>
  </XStack>
)

type PhoneInputFieldProps = {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  error?: string
  country: PhoneCountryOption['code']
  onCountryChange: (value: PhoneCountryOption['code']) => void
  selectedCountry: PhoneCountryOption
  options: PhoneCountryOption[]
  disabled?: boolean
}

const PhoneInputField = ({
  value,
  onChange,
  onBlur,
  error,
  country,
  onCountryChange,
  selectedCountry,
  options,
  disabled,
}: PhoneInputFieldProps) => {
  const placeholder = formatPhoneInput('2015550123', country) || '201-555-0123'

  return (
    <YStack gap="$2" w="100%">
      <Paragraph fontSize={15} theme="alt2" textAlign="left" w="100%">
        Country/Region
      </Paragraph>
      <YStack
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius={12}
        backgroundColor="$background"
        px="$3"
        py="$2"
        shadowColor="$shadowColor"
        shadowOpacity={0.06}
        shadowRadius={8}
        shadowOffset={{ width: 0, height: 2 }}
        elevation={2}
      >
        <XStack ai="center" gap="$2">
          <CountryPicker
            value={country}
            onChange={onCountryChange}
            selected={selectedCountry}
            options={options}
            disabled={disabled}
          />
          <Input
            value={value ?? ''}
            onChangeText={(text) => onChange(formatPhoneInput(text, country))}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor="$color10"
            autoComplete="tel"
            textContentType="telephoneNumber"
            keyboardType="phone-pad"
            inputMode="numeric"
            maxLength={24}
            selectionColor={PRIMARY_COLOR}
            caretColor={PRIMARY_COLOR}
            disabled={disabled}
            flex={1}
            fontSize={17}
            color="$color"
            borderWidth={0}
            backgroundColor="transparent"
            px={0}
            py={0}
          />
        </XStack>
      </YStack>
      <FieldError message={error} />
    </YStack>
  )
}

type CountryPickerProps = {
  value: PhoneCountryOption['code']
  onChange: (value: PhoneCountryOption['code']) => void
  selected: PhoneCountryOption
  options: PhoneCountryOption[]
  disabled?: boolean
}

const CountryPicker = ({ value, onChange, selected, options, disabled }: CountryPickerProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const popularOptions = useMemo(
    () => options.filter((option) => POPULAR_COUNTRIES.includes(option.code)),
    [options]
  )
  const filteredOptions = useMemo(
    () => filterCountryOptions(options, normalizedQuery),
    [normalizedQuery, options]
  )
  const otherOptions = useMemo(() => {
    if (normalizedQuery) return filteredOptions
    return options.filter((option) => !POPULAR_COUNTRIES.includes(option.code))
  }, [filteredOptions, normalizedQuery, options])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const handleSelect = (code: PhoneCountryOption['code']) => {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      <Button
        chromeless
        onPress={() => setOpen(true)}
        disabled={disabled}
        padding={0}
        flexShrink={0}
        alignSelf="center"
        backgroundColor="transparent"
        pressStyle={{ opacity: 0.7 }}
      >
        <XStack ai="center" gap="$1">
          <Text fontSize={17}>{selected.flag}</Text>
          <Text fontSize={17} fontWeight="700">+{selected.callingCode}</Text>
          <ChevronDown size={16} color="$color10" />
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
              Select country
            </SizableText>
            <Button
              chromeless
              size="$2"
              onPress={() => setOpen(false)}
              color={PRIMARY_COLOR}
            >
              Close
            </Button>
          </XStack>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search country or code"
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
                />
              ) : null}
              <CountrySection
                title={normalizedQuery ? 'Results' : 'All countries'}
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

type CountrySectionProps = {
  title: string
  options: PhoneCountryOption[]
  selected: PhoneCountryOption['code']
  onSelect: (code: PhoneCountryOption['code']) => void
}

const CountrySection = ({ title, options, selected, onSelect }: CountrySectionProps) => {
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
              <Text fontSize={16}>
                {option.name}
              </Text>
            </XStack>
            <Text fontSize={15} color="$color10">
              +{option.callingCode}
            </Text>
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

const formatOtpError = (message: string) => {
  const normalized = message.toLowerCase()
  if (normalized.includes('expired')) return 'Code expired. Resend?'
  if (normalized.includes('invalid') || normalized.includes('token') || normalized.includes('otp')) {
    return 'Incorrect code. Try again.'
  }
  return message
}

type OtpInputFieldProps = {
  value: string
  onChange: (value: string) => void
  onComplete: (value: string) => void
  error?: string
  disabled?: boolean
}

const OtpInputField = ({ value, onChange, onComplete, error, disabled }: OtpInputFieldProps) => {
  const [focused, setFocused] = useState(false)
  const lastComplete = useRef<string | null>(null)
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 6)

  useEffect(() => {
    if (value !== digits) onChange(digits)
  }, [digits, onChange, value])

  const handleChange = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, 6)
    onChange(next)
    if (next.length === 6 && next !== lastComplete.current && !disabled) {
      lastComplete.current = next
      onComplete(next)
      return
    }
    if (next.length < 6) lastComplete.current = null
  }

  const activeIndex = Math.min(digits.length, 5)

  return (
    <YStack gap="$2" w="100%" ai="center" position="relative">
      <XStack gap="$1" jc="space-between" w="100%" maxWidth={360}>
        {Array.from({ length: 6 }).map((_, index) => {
          const digit = digits[index] ?? ''
          const isActive = focused && index === activeIndex
          const isFilled = digit.length > 0
          return (
            <YStack
              key={`otp-${index}`}
              width={56}
              height={56}
              borderRadius={12}
              borderWidth={isActive ? 2 : 1}
              borderColor={isFilled || isActive ? PRIMARY_COLOR : '$borderColor'}
              alignItems="center"
              justifyContent="center"
              accessibilityLabel={`Code digit ${index + 1}`}
            >
              <Text fontSize={28} fontWeight="700">
                {digit}
              </Text>
            </YStack>
          )
        })}
      </XStack>
      <Input
        value={digits}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={6}
        autoFocus
        disabled={disabled}
        caretHidden
        opacity={0}
        position="absolute"
        width="100%"
        height="100%"
        accessibilityLabel="Verification code"
      />
      <FieldError message={error} />
    </YStack>
  )
}

const resolvePostAuthRoute = async (supabase: ReturnType<typeof useSupabase>, userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`${PROFILE_COMPLETION_FIELDS},${PROFILE_APPROVAL_FIELDS}`)
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return '/onboarding/profile'
  if (!isProfileComplete(data)) return '/onboarding/profile'
  if (!isProfileApproved(data)) return '/onboarding/review'
  return '/'
}
