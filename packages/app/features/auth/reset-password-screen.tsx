import { Button, FormWrapper, H2, Paragraph, SubmitButton, Text, Theme, YStack } from '@my/ui/public'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { SchemaForm, formFields } from 'app/utils/SchemaForm'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useEffect, useState } from 'react'
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import { createParam } from 'solito'
import { Link } from 'solito/link'
import { z } from 'zod'

const { useParams, useUpdateParams } = createParam<{ email?: string }>()

const ResetPasswordSchema = z.object({
  email: formFields.text.email().describe('Email // your@email.acme'),
})

const NewPasswordSchema = z.object({
  password: formFields.text.min(8, 'Use at least 8 characters'),
})

export const ResetPasswordScreen = () => {
  const supabase = useSupabase()
  const { params } = useParams()
  const updateParams = useUpdateParams()
  const [mode, setMode] = useState<'request' | 'reset'>('request')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (params?.email) {
      updateParams({ email: undefined }, { web: { replace: true } })
    }
  }, [params?.email, updateParams])

  useEffect(() => {
    const handleRecovery = async () => {
      if (typeof window === 'undefined') {
        setChecking(false)
        return
      }
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      if (!code) {
        setChecking(false)
        return
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) setMode('reset')
      setChecking(false)
    }
    handleRecovery()
  }, [supabase])

  if (checking) {
    return (
      <FormWrapper>
        <FormWrapper.Body>
          <Paragraph theme="alt1">Loading...</Paragraph>
        </FormWrapper.Body>
      </FormWrapper>
    )
  }

  if (mode === 'reset') {
    const form = useForm<z.infer<typeof NewPasswordSchema>>()

    const setPassword = async ({ password }: z.infer<typeof NewPasswordSchema>) => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        form.setError('password', { type: 'custom', message: error.message })
        return
      }
      form.reset()
      setMode('request')
    }

    return (
      <FormProvider {...form}>
        <SchemaForm
          form={form}
          schema={NewPasswordSchema}
          defaultValues={{ password: '' }}
          onSubmit={setPassword}
          renderAfter={({ submit }) => (
            <Theme inverse>
              <SubmitButton onPress={() => submit()} br="$10">
                Update password
              </SubmitButton>
            </Theme>
          )}
        >
          {(fields) => (
            <>
              <YStack gap="$3" mb="$4">
                <H2 $sm={{ size: '$8' }}>Set a new password</H2>
                <Paragraph theme="alt1">Enter your new password to finish resetting.</Paragraph>
              </YStack>
              {fields.password}
            </>
          )}
        </SchemaForm>
      </FormProvider>
    )
  }

  const form = useForm<z.infer<typeof ResetPasswordSchema>>()

  async function resetPassword({ email }: z.infer<typeof ResetPasswordSchema>) {
    const redirectTo = resolveResetRedirect()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      const errorMessage = error?.message.toLowerCase()
      if (errorMessage.includes('email')) {
        form.setError('email', { type: 'custom', message: errorMessage })
      } else {
        form.setError('email', { type: 'custom', message: errorMessage })
      }
    }
  }

  return (
    <FormProvider {...form}>
      {form.formState.isSubmitSuccessful ? (
        <CheckYourEmail />
      ) : (
        <SchemaForm
          form={form}
          schema={ResetPasswordSchema}
          defaultValues={{
            email: params?.email || '',
          }}
          onSubmit={resetPassword}
          renderAfter={({ submit }) => {
            return (
              <>
                <Theme inverse>
                  <SubmitButton onPress={() => submit()} br="$10">
                    Send Link
                  </SubmitButton>
                </Theme>
                <SignInLink />
              </>
            )
          }}
        >
          {(fields) => (
            <>
              <YStack gap="$3" mb="$4">
                <H2 $sm={{ size: '$8' }}>Reset your password</H2>
                <Paragraph theme="alt1">
                  Type in your email and we&apos;ll send you a link to reset your password
                </Paragraph>
              </YStack>
              {Object.values(fields)}
            </>
          )}
        </SchemaForm>
      )}
    </FormProvider>
  )
}

const CheckYourEmail = () => {
  const email = useWatch<z.infer<typeof ResetPasswordSchema>>({ name: 'email' })
  const { reset } = useFormContext()

  return (
    <FormWrapper>
      <FormWrapper.Body>
        <YStack gap="$3">
          <H2>Check Your Email</H2>
          <Paragraph theme="alt1">
            We&apos;ve sent you a reset link. Please check your email ({email}) and confirm it.
          </Paragraph>
        </YStack>
      </FormWrapper.Body>
      <FormWrapper.Footer>
        <Button themeInverse icon={ChevronLeft} br="$10" onPress={() => reset()}>
          Back
        </Button>
      </FormWrapper.Footer>
    </FormWrapper>
  )
}

const SignInLink = () => {
  const email = useWatch<z.infer<typeof ResetPasswordSchema>>({ name: 'email' })

  return (
    <Link href={`/sign-in?${new URLSearchParams(email ? { email } : undefined)}`}>
      <Paragraph ta="center" theme="alt1">
        Done resetting? <Text textDecorationLine="underline">Sign in</Text>
      </Paragraph>
    </Link>
  )
}

const resolveResetRedirect = () => {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.EXPO_PUBLIC_URL || process.env.NEXT_PUBLIC_URL
  if (!base) return undefined
  try {
    return new URL('/reset-password', base).toString()
  } catch {
    return base
  }
}
