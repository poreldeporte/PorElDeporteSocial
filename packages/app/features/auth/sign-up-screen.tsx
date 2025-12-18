import {
  Button,
  Checkbox,
  FormWrapper,
  H2,
  Label,
  LoadingOverlay,
  Paragraph,
  SubmitButton,
  Text,
  Theme,
  YStack,
  isWeb,
  XStack,
} from '@my/ui/public'
import { Check as CheckIcon, ChevronLeft } from '@tamagui/lucide-icons'
import { SchemaForm } from 'app/utils/SchemaForm'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import React, { useCallback, useEffect, useState } from 'react'
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import { createParam } from 'solito'
import { Link } from 'solito/link'
import { z } from 'zod'
import { formatDateInput } from '../profile/edit-screen'

import { AuthIntro } from './components'
import { POSITION_OPTIONS, signUpFieldSchema } from '../profile/profile-field-schema'

const { useParams, useUpdateParams } = createParam<{ email?: string }>()

const SignUpSchema = signUpFieldSchema.pick({
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  password: true,
  jerseyNumber: true,
  position: true,
  birthDate: true,
})

type SignUpValues = z.infer<typeof SignUpSchema>

export const SignUpScreen = () => {
  const supabase = useSupabase()
  const { isLoadingSession } = useUser()
  const { params } = useParams()
  const updateParams = useUpdateParams()
  const form = useForm<SignUpValues>()

  useEffect(() => {
    if (params?.email) {
      updateParams({ email: undefined }, { web: { replace: true } })
    }
  }, [params?.email, updateParams])

  const signUpWithEmail = useCallback(
    async ({
      firstName,
      lastName,
      phone,
      email,
      password,
      jerseyNumber,
      position,
      birthDate,
    }: SignUpValues) => {
      const redirectTo = resolveAuthRedirect()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            phone: phone.trim(),
            jersey_number: jerseyNumber ?? null,
            position: position?.join(',') ?? null,
            birth_date: birthDate ? formatDateInput(birthDate.dateValue) : null,
          },
        },
      })

      if (error) {
        const message = error.message || 'Unable to sign up right now.'
        const lower = message.toLowerCase()
        if (lower.includes('email')) {
          form.setError('email', { type: 'custom', message })
        } else if (lower.includes('password')) {
          form.setError('password', { type: 'custom', message })
        } else {
          form.setError('root', { type: 'custom', message })
        }
      }
    },
    [form, supabase]
  )

  const resendVerification = useCallback(
    async (email: string) => {
      const redirectTo = resolveAuthRedirect()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      })
      if (error) {
        throw new Error(error.message)
      }
    },
    [supabase]
  )

  return (
    <FormProvider {...form}>
      {form.formState.isSubmitSuccessful ? (
        <CheckYourEmail onResend={resendVerification} />
      ) : (
        <FormWrapper>
          <SchemaForm
            form={form}
            schema={SignUpSchema}
            defaultValues={{
              firstName: '',
              lastName: '',
              phone: '',
              email: params?.email || '',
            password: '',
            jerseyNumber: undefined,
            position: [],
            birthDate: undefined,
          }}
            onSubmit={signUpWithEmail}
            props={{
              password: {
                secureTextEntry: true,
              },
            }}
            renderAfter={({ submit }) => (
              <>
                {form.formState.errors.root?.message ? (
                  <Paragraph ta="center" theme="red">
                    {form.formState.errors.root.message}
                  </Paragraph>
                ) : null}
              <Theme inverse>
                <SubmitButton onPress={() => submit()} br="$10">
                  Create account
                </SubmitButton>
              </Theme>
              <SignInLink />
            </>
          )}
        >
          {(fields) => (
            <>
              <AuthIntro title="Join the roster" subtitle="Create your Por El Deporte account" />
              <YStack gap="$3">
                {fields.firstName}
                {fields.lastName}
              {fields.phone}
              {fields.email}
              <PositionCheckboxes />
              {fields.jerseyNumber}
              {fields.birthDate}
              {fields.password}
            </YStack>
          </>
        )}
      </SchemaForm>
          {isLoadingSession && <LoadingOverlay />}
        </FormWrapper>
      )}
    </FormProvider>
  )
}

const SignInLink = () => {
  const email = useWatch<SignUpValues>({ name: 'email' })
  const search = email ? `?${new URLSearchParams({ email }).toString()}` : ''

  return (
    <Link href={`/sign-in${search}`}>
      <Paragraph ta="center" theme="alt1">
        Already signed up? <Text textDecorationLine="underline">Sign in</Text>
      </Paragraph>
    </Link>
  )
}

const CheckYourEmail = ({ onResend }: { onResend: (email: string) => Promise<void> }) => {
  const email = useWatch<SignUpValues>({ name: 'email' })
  const firstName = useWatch<SignUpValues>({ name: 'firstName' })
  const { reset } = useFormContext<SignUpValues>()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>()

  const handleResend = async () => {
    if (!email) return
    setStatus('loading')
    setMessage(undefined)
    try {
      await onResend(email)
      setStatus('success')
      setMessage(`Verification email sent to ${email}.`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unable to resend right now.')
    }
  }

  return (
    <FormWrapper>
      <FormWrapper.Body>
        <YStack gap="$3">
          <H2>{firstName ? `Great pass, ${firstName}!` : 'Check Your Email'}</H2>
          <Paragraph theme="alt1">
            We&apos;ve sent you a confirmation link. Please check your email ({email}) and confirm it
            to unlock Por El Deporte.
          </Paragraph>
          {message ? (
            <Paragraph theme={status === 'error' ? 'red' : 'alt1'} size="$2">
              {message}
            </Paragraph>
          ) : null}
        </YStack>
      </FormWrapper.Body>
      <FormWrapper.Footer>
        <XStack gap="$2" flexWrap="wrap">
          <Button themeInverse icon={ChevronLeft} br="$10" onPress={() => reset()}>
            Back
          </Button>
          <Button
            theme="alt1"
            br="$10"
            onPress={handleResend}
            disabled={!email || status === 'loading'}
          >
            {status === 'loading' ? 'Sending…' : 'Resend email'}
          </Button>
        </XStack>
      </FormWrapper.Footer>
    </FormWrapper>
  )
}

const PositionCheckboxes = () => {
  const { watch, setValue } = useFormContext<SignUpValues>()
  const selected = watch('position') ?? []

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    setValue('position', next, { shouldValidate: true })
  }

  return (
    <YStack gap="$2">
      <Paragraph theme="alt2">Positions</Paragraph>
      <YStack gap="$2">
        {POSITION_OPTIONS.map((option) => (
          <XStack key={option} ai="center" gap="$2">
            <Checkbox
              checked={selected.includes(option)}
              onCheckedChange={() => toggle(option)}
              id={`position-${option}`}
              size="$3"
            >
              <Checkbox.Indicator>
                <CheckIcon size={12} />
              </Checkbox.Indicator>
            </Checkbox>
            <Label htmlFor={`position-${option}`} onPress={() => toggle(option)}>
              {option}
            </Label>
          </XStack>
        ))}
      </YStack>
    </YStack>
  )
}

const resolveAuthRedirect = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  if (process.env.EXPO_PUBLIC_URL) return process.env.EXPO_PUBLIC_URL
  if (process.env.NEXT_PUBLIC_URL) return process.env.NEXT_PUBLIC_URL
  return undefined
}
