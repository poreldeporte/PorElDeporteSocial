import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { SolitoImage } from 'solito/image'
import { useRouter } from 'solito/router'

import {
  Button,
  FieldError,
  FormWrapper,
  H2,
  Input,
  Link,
  LoadingOverlay,
  Paragraph,
  SizableText,
  Text,
  XStack,
  YStack,
} from '@my/ui/public'
import { pedLogo } from 'app/assets'
import { CountryPicker } from 'app/components/CountryPicker'
import { UsPhoneMaskInput } from 'app/components/UsPhoneMaskInput'
import { BRAND_COLORS } from 'app/constants/colors'
import { SCREEN_CONTENT_PADDING } from 'app/constants/layout'
import { PROFILE_APPROVAL_FIELDS, isProfileApproved } from 'app/utils/auth/profileApproval'
import { PROFILE_COMPLETION_FIELDS, isProfileComplete } from 'app/utils/auth/profileCompletion'
import {
  formatPhoneDisplay,
  formatPhoneInput,
  getPhoneCountryOptions,
  normalizePhoneDigits,
  parsePhoneToE164,
  type PhoneCountryOption,
} from 'app/utils/phone'
import { usePathname } from 'app/utils/usePathname'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'

const RESEND_SECONDS = 30
const DEFAULT_COUNTRY: PhoneCountryOption['code'] = 'US'
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
  const pathname = usePathname()
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
  const codeValue = codeForm.watch('code')
  const codeDigits = codeValue?.replace(/\D/g, '') ?? ''

  useEffect(() => {
    if (pathname !== '/sign-in') return
    setStep('phone')
    setPhone(null)
    setStatus('idle')
    setResendSeconds(0)
    phoneForm.reset({ phone: '' })
    codeForm.reset({ code: '' })
  }, [codeForm, pathname, phoneForm])

  useEffect(() => {
    const current = phoneForm.getValues('phone')
    if (!current) return
    const normalized = normalizePhoneDigits(current, country)
    if (normalized !== current) phoneForm.setValue('phone', normalized)
  }, [country, phoneForm])

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

  const phoneDisplay = phone ? formatPhoneDisplay(phone) : 'your number'
  const contentPaddingTop = SCREEN_CONTENT_PADDING.top
  const submitDisabled = status !== 'idle'

  return (
    <YStack f={1} bg="$color1">
      <FormWrapper f={1} jc="space-between" gap="$0">
      <FormWrapper.Body p="$0" scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
          {step === 'phone' ? (
            <YStack
              key="phone-step"
              px={SCREEN_CONTENT_PADDING.horizontal}
              gap="$5"
              ai="center"
              style={{ paddingTop: contentPaddingTop }}
            >
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
              <YStack
                key="code-step"
                px={SCREEN_CONTENT_PADDING.horizontal}
                gap="$5"
                ai="center"
                style={{ paddingTop: contentPaddingTop }}
              >
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
        <FormWrapper.Footer pb={SCREEN_CONTENT_PADDING.bottom} px={SCREEN_CONTENT_PADDING.horizontal}>
          <Button
            backgroundColor="#fff"
            borderColor="#fff"
            borderWidth={1}
            color="#000"
            fontSize={17}
            fontWeight="600"
            height={54}
            borderRadius={999}
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
  const placeholder = formatPhoneInput('2015550123', country) || '2015550123'

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
            variant="dial"
            searchPlaceholder="Search country or code"
          />
          {country === 'US' ? (
            <UsPhoneMaskInput
              value={value ?? ''}
              onChange={onChange}
              onBlur={onBlur}
              disabled={disabled}
              textProps={{ fontSize: 17, color: '$color' }}
              inputProps={{ selectionColor: PRIMARY_COLOR, caretColor: PRIMARY_COLOR }}
            />
          ) : (
            <Input
              value={value ?? ''}
              onChangeText={(text) => onChange(normalizePhoneDigits(text, country))}
              onBlur={onBlur}
              placeholder={placeholder}
              placeholderTextColor="$color10"
              autoComplete="tel"
              suppressHydrationWarning
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
          )}
        </XStack>
      </YStack>
      <FieldError message={error} />
    </YStack>
  )
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
  const inputRef = useRef<{ focus?: () => void } | null>(null)
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
  const focusInput = () => {
    if (disabled) return
    inputRef.current?.focus?.()
  }

  return (
    <YStack gap="$2" w="100%" ai="center" position="relative" onPress={focusInput}>
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
        ref={inputRef}
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
