import {
  Avatar,
  Button,
  Card,
  Checkbox,
  FieldError,
  Fieldset,
  FormWrapper,
  FullscreenSpinner,
  Paragraph,
  Label,
  isWeb,
  SizableText,
  SubmitButton,
  Theme,
  View,
  XStack,
  YStack,
  useToastController,
} from '@my/ui/public'
import type { ScrollViewProps } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pedLogo } from 'app/assets'
import { BRAND_COLORS } from 'app/constants/colors'
import { getDockSpacer } from 'app/constants/dock'
import { SCREEN_CONTENT_PADDING } from 'app/constants/layout'
import { CountryPicker } from 'app/components/CountryPicker'
import { FloatingCtaDock } from 'app/components/FloatingCtaDock'
import { SchemaForm } from 'app/utils/SchemaForm'
import { getPhoneCountryOptions, type PhoneCountryOption } from 'app/utils/phone'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import { type ReactNode, useRef } from 'react'
import { createParam } from 'solito'
import { SolitoImage } from 'solito/image'
import { useRouter } from 'solito/router'
import { useController, useFormContext } from 'react-hook-form'
import { Check as CheckIcon } from '@tamagui/lucide-icons'

import { api } from '../../utils/api'
import {
  emptyBirthDateParts,
  formatBirthDateParts,
  parseBirthDateParts,
  type BirthDateParts,
} from '../../utils/birthDate'
import {
  profileUpdateFieldSchema,
  POSITION_OPTIONS,
  type ProfileUpdateFieldValues,
} from './profile-field-schema'

const { useParams } = createParam<{ edit_name?: '1' }>()
export const EditProfileScreen = (props: ScrollHeaderProps) => {
  return <ProfileFormScreen floatingCta {...props} />
}

const ProfileSchema = profileUpdateFieldSchema

type ProfileFormScreenProps = {
  submitLabel?: string
  onComplete?: () => void
  showStatusBadge?: boolean
  floatingCta?: boolean
}

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const ProfileFormScreen = ({
  submitLabel,
  onComplete,
  showStatusBadge = true,
  floatingCta = false,
  scrollProps,
  headerSpacer,
  topInset,
}: ProfileFormScreenProps & ScrollHeaderProps) => {
  const { profile, user } = useUser()

  if (!profile || !user?.id) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }
  const approvalStatus = profile.approval_status === 'approved' ? 'approved' : 'pending'
  return (
    <EditProfileForm
      userId={user.id}
      initial={buildProfileFormInitial(profile, user)}
      submitLabel={submitLabel}
      approvalStatus={approvalStatus}
      showStatusBadge={showStatusBadge}
      onComplete={onComplete}
      floatingCta={floatingCta}
      scrollProps={scrollProps}
      headerSpacer={headerSpacer}
    />
  )
}

const EditProfileForm = ({
  initial,
  userId,
  submitLabel = 'Update Profile',
  approvalStatus,
  showStatusBadge = true,
  onComplete,
  floatingCta = false,
  showBrandAccent = false,
  scrollProps,
  headerSpacer,
}: {
  initial: ProfileFormInitial
  userId: string
  submitLabel?: string
  approvalStatus: 'draft' | 'pending' | 'approved'
  showStatusBadge?: boolean
  onComplete?: () => void
  floatingCta?: boolean
  showBrandAccent?: boolean
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
}) => {
  const { params } = useParams()
  const insets = useSafeAreaInsets()
  const showFloatingCta = floatingCta && !isWeb
  const dockSpacer = showFloatingCta ? getDockSpacer(insets.bottom) : 0
  const submitRef = useRef<(() => void) | null>(null)
  const supabase = useSupabase()
  const toast = useToastController()
  const queryClient = useQueryClient()
  const router = useRouter()
  const apiUtils = api.useUtils()
  const mutation = useMutation({
    async mutationFn(data: ProfileUpdateFieldValues) {
      const birthDate = formatBirthDateParts(data.birthDate)
      if (!birthDate) {
        throw new Error('Enter a valid birth date.')
      }
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          address: data.address?.trim() || null,
          nationality: data.nationality?.trim() || null,
          name: `${data.firstName} ${data.lastName}`.trim(),
          birth_date: birthDate,
          jersey_number: data.jerseyNumber,
          position: data.position?.length ? data.position.join(',') : null,
          approval_status: approvalStatus,
        })
        .eq('id', userId)
        .select('id')
        .maybeSingle()
      if (error) {
        throw new Error(error.message)
      }
      if (!updated?.id) {
        throw new Error('Unable to update profile.')
      }
    },

    async onSuccess() {
      toast.show('Successfully updated!')
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      await apiUtils.greeting.invalidate()
      if (onComplete) {
        onComplete()
        return
      }
      router.back()
    },

    onError(error: Error) {
      toast.show('Unable to update profile', { message: error.message })
    },
  })

  const displayName = buildProfileDisplayName(initial)
  const statusLabel = buildProfileStatusLabel(approvalStatus)
  const mergedScrollProps = {
    ...scrollProps,
    contentInsetAdjustmentBehavior: 'never',
  }
  const handleSubmit = () => submitRef.current?.()
  const renderAfter = showFloatingCta
    ? ({ submit }: { submit: () => void }) => {
        submitRef.current = submit
        return null
      }
    : ({ submit }: { submit: () => void }) => (
        <Theme inverse>
          <YStack>
            <SubmitButton disabled={mutation.isPending} onPress={() => submit()}>
              {mutation.isPending ? 'Saving…' : submitLabel}
            </SubmitButton>
          </YStack>
        </Theme>
      )

  return (
    <FormWrapper jc="flex-start">
      <SchemaForm
        bare
        schema={ProfileSchema}
        props={{
          firstName: {
            autoFocus: !!params?.edit_name,
          },
          phone: {
            inputMode: 'tel',
            disabled: true,
          } as any,
        }}
        defaultValues={{
          firstName: initial.firstName,
          lastName: initial.lastName,
          email: initial.email,
          phone: initial.phone,
          address: initial.address,
          nationality: initial.nationality,
          birthDate: initial.birthDate,
          jerseyNumber: initial.jerseyNumber,
          position: initial.position ?? [],
        }}
        onSubmit={(values) => mutation.mutate(values)}
        renderAfter={renderAfter}
      >
        {(fields) => (
          <>
            <FormWrapper.Body
              p={0}
              px={SCREEN_CONTENT_PADDING.horizontal}
              pt={headerSpacer ? 0 : SCREEN_CONTENT_PADDING.top}
              pb={SCREEN_CONTENT_PADDING.bottom}
              scrollProps={mergedScrollProps}
            >
              {headerSpacer}
              <YStack ai="center" gap="$2" mb="$2">
                <View>
                  <UserAvatar />
                </View>
                <SizableText size="$7" fontWeight="700" textAlign="center">
                  {displayName}
                </SizableText>
                {showStatusBadge ? <StatusBadge label={statusLabel} /> : null}
                <Paragraph theme="alt2" size="$2" textAlign="center">
                  Private club details for lineups and access.
                </Paragraph>
                {showBrandAccent ? (
                  <YStack h={2} w={56} br={999} bg={BRAND_COLORS.primary} />
                ) : null}
              </YStack>
              <YStack gap="$4">
                <Card bordered $platform-native={{ borderWidth: 0 }} p="$4">
                  <YStack gap="$3">
                    <YStack gap="$1">
                      <SizableText size="$5" fontWeight="700">
                        Identity
                      </SizableText>
                      <Paragraph theme="alt2" size="$2">
                        Keep this aligned with your membership details.
                      </Paragraph>
                    </YStack>
                    <XStack gap="$3" $sm={{ fd: 'column' }}>
                      <YStack f={1}>{fields.firstName}</YStack>
                      <YStack f={1}>{fields.lastName}</YStack>
                    </XStack>
                    <YStack gap="$1">
                      {fields.email}
                      <Paragraph theme="alt2" size="$2">
                        Used for member updates and scheduling.
                      </Paragraph>
                    </YStack>
                    <YStack gap="$1">
                      {fields.phone}
                      <Paragraph theme="alt2" size="$2">
                        Verified via SMS. Contact the club to change it.
                      </Paragraph>
                    </YStack>
                    <NationalityField />
                  </YStack>
                </Card>
                <Card bordered $platform-native={{ borderWidth: 0 }} p="$4">
                  <YStack gap="$3">
                    <YStack gap="$1">
                      <SizableText size="$5" fontWeight="700">
                        Player details
                      </SizableText>
                      <Paragraph theme="alt2" size="$2">
                        This helps us balance teams and matchups.
                      </Paragraph>
                    </YStack>
                    <PositionCheckboxes />
                    <XStack gap="$3" $sm={{ fd: 'column' }}>
                      <YStack f={1} gap="$1">
                        {fields.jerseyNumber}
                        <Paragraph theme="alt2" size="$2">
                          1-99. Match your kit number.
                        </Paragraph>
                      </YStack>
                      <YStack f={1} gap="$1">
                        {fields.birthDate}
                        <Paragraph theme="alt2" size="$2">
                          Used for birthdays and eligibility.
                        </Paragraph>
                      </YStack>
                    </XStack>
                  </YStack>
                </Card>
                <Card bordered $platform-native={{ borderWidth: 0 }} p="$4">
                  <YStack gap="$3">
                    <YStack gap="$1">
                      <SizableText size="$5" fontWeight="700">
                        Location
                      </SizableText>
                      <Paragraph theme="alt2" size="$2">
                        Optional for local game planning.
                      </Paragraph>
                    </YStack>
                    {fields.address}
                  </YStack>
                </Card>
              </YStack>
              {showFloatingCta ? <YStack h={dockSpacer} /> : null}
            </FormWrapper.Body>
            {showFloatingCta ? (
              <FloatingSubmitBar
                label={mutation.isPending ? 'Saving…' : submitLabel}
                onPress={handleSubmit}
                disabled={mutation.isPending}
              />
            ) : null}
          </>
        )}
      </SchemaForm>
    </FormWrapper>
  )
}

const FloatingSubmitBar = ({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled: boolean
}) => {
  return (
    <FloatingCtaDock>
      <Theme inverse>
        <XStack>
          <SubmitButton flex={1} onPress={onPress} disabled={disabled}>
            {label}
          </SubmitButton>
        </XStack>
      </Theme>
    </FloatingCtaDock>
  )
}

type ProfileRow = {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  nationality: string | null
  birth_date: string | null
  jersey_number: number | null
  position: string | null
}

type ProfileFormInitial = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: string
  nationality: string
  birthDate: BirthDateParts
  jerseyNumber?: number
  position: string[]
}

const buildProfileFormInitial = (
  profile: ProfileRow,
  user?: { email?: string | null; phone?: string | null }
) => ({
  firstName: profile.first_name ?? '',
  lastName: profile.last_name ?? '',
  email: profile.email ?? user?.email ?? '',
  phone: profile.phone ?? user?.phone ?? '',
  address: profile.address ?? '',
  nationality: profile.nationality ?? '',
  birthDate: parseBirthDateParts(profile.birth_date) ?? emptyBirthDateParts(),
  jerseyNumber: profile.jersey_number ?? undefined,
  position: profile.position
    ? profile.position.split(',').map((p) => p.trim()).filter(Boolean)
    : [],
})

const buildProfileDisplayName = (initial: ProfileFormInitial) => {
  const name = [initial.firstName, initial.lastName].filter(Boolean).join(' ').trim()
  return name || 'Member profile'
}

const buildProfileStatusLabel = (status: 'draft' | 'pending' | 'approved') => {
  if (status === 'approved') return 'Membership Active'
  if (status === 'draft') return 'Setup incomplete'
  return 'Review pending'
}

const StatusBadge = ({ label }: { label: string }) => {
  return (
    <XStack
      ai="center"
      jc="center"
      px="$2.5"
      py="$1"
      borderRadius="$10"
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$background"
    >
      <Paragraph size="$2" fontWeight="600">
        {label}
      </Paragraph>
    </XStack>
  )
}

export const AdminProfileEditScreen = ({
  profileId,
  scrollProps,
  headerSpacer,
  topInset,
}: { profileId: string } & ScrollHeaderProps) => {
  const { role, isLoading } = useUser()
  const supabase = useSupabase()
  const router = useRouter()
  const queryClient = useQueryClient()
  const profileQuery = useQuery({
    queryKey: ['profile', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, first_name, last_name, email, phone, address, nationality, birth_date, jersey_number, position, approval_status'
        )
        .eq('id', profileId)
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    enabled: role === 'admin' && !isLoading && !!profileId,
  })

  if (isLoading) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (role !== 'admin') {
    return (
      <YStack f={1} ai="center" jc="center" px="$6" gap="$2" pt={topInset ?? 0}>
        <SizableText size="$6" fontWeight="700">
          Admin access only
        </SizableText>
        <Paragraph theme="alt2" textAlign="center">
          Talk to a club steward if you need approval access.
        </Paragraph>
      </YStack>
    )
  }

  if (profileQuery.isLoading) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <YStack f={1} ai="center" jc="center" px="$4" gap="$3" pt={topInset ?? 0}>
        <Paragraph theme="alt2">
          {profileQuery.isError ? 'Unable to load this member.' : 'Member not found.'}
        </Paragraph>
        <XStack gap="$2">
          {profileQuery.isError ? (
            <Button onPress={() => profileQuery.refetch()} disabled={profileQuery.isFetching}>
              {profileQuery.isFetching ? 'Refreshing...' : 'Retry'}
            </Button>
          ) : null}
          <Button onPress={() => router.back()}>Go back</Button>
        </XStack>
      </YStack>
    )
  }

  const approvalStatus = profileQuery.data.approval_status ?? 'pending'
  const initial = buildProfileFormInitial(profileQuery.data, {
    email: profileQuery.data.email,
    phone: profileQuery.data.phone,
  })

  return (
    <EditProfileForm
      userId={profileId}
      initial={initial}
      approvalStatus={approvalStatus}
      submitLabel="Save changes"
      floatingCta
      showBrandAccent
      onComplete={() => {
        void queryClient.invalidateQueries({ queryKey: ['member-approvals', 'pending'] })
        router.back()
      }}
      scrollProps={scrollProps}
      headerSpacer={headerSpacer}
    />
  )
}

const NationalityField = () => {
  const { control, formState } = useFormContext<ProfileUpdateFieldValues>()
  const { field, fieldState } = useController({ control, name: 'nationality' })
  const options = getPhoneCountryOptions()
  const value = (field.value || null) as PhoneCountryOption['code'] | null
  const selected = value ? options.find((option) => option.code === value) ?? null : null
  const errorMessage = fieldState.error?.message

  return (
    <Theme name={errorMessage ? 'red' : null} forceClassName>
      <Fieldset gap="$2">
        <Label theme="alt1" size="$3">
          Nationality (Optional)
        </Label>
        <YStack
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius={12}
          backgroundColor="$background"
          px="$3"
          py="$2"
        >
          <CountryPicker
            value={value}
            onChange={(code) => field.onChange(code)}
            selected={selected}
            options={options}
            disabled={formState.isSubmitting}
            variant="country"
            title="Select nationality"
            placeholder="Select country"
            popularCountries={['US', 'AR', 'BR', 'GB', 'DE', 'ES']}
          />
        </YStack>
        <FieldError message={errorMessage} />
      </Fieldset>
    </Theme>
  )
}

const PositionCheckboxes = () => {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ProfileUpdateFieldValues>()
  const selected = watch('position') ?? []
  const positionError = errors.position
  const errorMessage =
    typeof positionError?.message === 'string'
      ? positionError.message
      : (positionError as { errorMessage?: string } | undefined)?.errorMessage

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    setValue('position', next, { shouldValidate: true })
  }

  return (
    <YStack gap="$2">
      <Paragraph theme="alt2">Preferred positions</Paragraph>
      <YStack gap="$2">
        {POSITION_OPTIONS.map((option) => (
          <XStack key={option} ai="center" gap="$2">
            <Checkbox
              checked={selected.includes(option)}
              onCheckedChange={() => toggle(option)}
              id={`position-edit-${option}`}
              size="$3"
            >
              <Checkbox.Indicator>
                <CheckIcon size={12} />
              </Checkbox.Indicator>
            </Checkbox>
            <Label htmlFor={`position-edit-${option}`} onPress={() => toggle(option)}>
              {option}
            </Label>
          </XStack>
        ))}
      </YStack>
      <FieldError message={errorMessage} />
    </YStack>
  )
}

const UserAvatar = () => {
  return (
    <Avatar circular size={128}>
      <SolitoImage src={pedLogo} alt="Por El Deporte crest" width={128} height={128} />
    </Avatar>
  )
}
