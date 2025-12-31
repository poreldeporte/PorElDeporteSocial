import {
  Avatar,
  Button,
  Card,
  Checkbox,
  FieldError,
  FormWrapper,
  FullscreenSpinner,
  Paragraph,
  Label,
  SizableText,
  SubmitButton,
  Theme,
  View,
  XStack,
  YStack,
  useToastController,
} from '@my/ui/public'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SchemaForm } from 'app/utils/SchemaForm'
import { pedLogo } from 'app/assets'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import { createParam } from 'solito'
import { SolitoImage } from 'solito/image'
import { useRouter } from 'solito/router'
import { useFormContext } from 'react-hook-form'
import { Check as CheckIcon } from '@tamagui/lucide-icons'

import { api } from '../../utils/api'
import {
  profileUpdateFieldSchema,
  POSITION_OPTIONS,
  type ProfileUpdateFieldValues,
} from './profile-field-schema'

const { useParams } = createParam<{ edit_name?: '1' }>()
export const EditProfileScreen = () => {
  return <ProfileFormScreen />
}

const ProfileSchema = profileUpdateFieldSchema

type ProfileFormScreenProps = {
  submitLabel?: string
  onComplete?: () => void
  showStatusBadge?: boolean
}

export const ProfileFormScreen = ({
  submitLabel,
  onComplete,
  showStatusBadge = true,
}: ProfileFormScreenProps) => {
  const { profile, user } = useUser()

  if (!profile || !user?.id) {
    return <FullscreenSpinner />
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
}: {
  initial: ProfileFormInitial
  userId: string
  submitLabel?: string
  approvalStatus: 'draft' | 'pending' | 'approved'
  showStatusBadge?: boolean
  onComplete?: () => void
}) => {
  const { params } = useParams()
  const supabase = useSupabase()
  const toast = useToastController()
  const queryClient = useQueryClient()
  const router = useRouter()
  const apiUtils = api.useUtils()
  const mutation = useMutation({
    async mutationFn(data: ProfileUpdateFieldValues) {
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          address: data.address?.trim() || null,
          name: `${data.firstName} ${data.lastName}`.trim(),
          birth_date: formatDateInput(data.birthDate.dateValue),
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
          birthDate: initial.birthDate,
          jerseyNumber: initial.jerseyNumber,
          position: initial.position ?? [],
        }}
        onSubmit={(values) => mutation.mutate(values)}
        renderAfter={({ submit }) => (
          <Theme inverse>
            <YStack>
              <SubmitButton disabled={mutation.isPending} onPress={() => submit()}>
                {mutation.isPending ? 'Saving…' : submitLabel}
              </SubmitButton>
            </YStack>
          </Theme>
        )}
      >
        {(fields) => (
          <FormWrapper.Body
            p={0}
            px="$4"
            pt="$4"
            pb="$8"
            scrollProps={{ contentInsetAdjustmentBehavior: 'never' }}
          >
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
          </FormWrapper.Body>
        )}
      </SchemaForm>
    </FormWrapper>
  )
}

type ProfileRow = {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  address: string | null
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
  birthDate?: { dateValue: Date }
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
  birthDate: profile.birth_date ? { dateValue: new Date(profile.birth_date) } : undefined,
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

export const AdminProfileEditScreen = ({ profileId }: { profileId: string }) => {
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
          'id, first_name, last_name, email, phone, address, birth_date, jersey_number, position, approval_status'
        )
        .eq('id', profileId)
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    enabled: role === 'admin' && !isLoading && !!profileId,
  })

  if (isLoading) {
    return <FullscreenSpinner />
  }

  if (role !== 'admin') {
    return (
      <YStack f={1} ai="center" jc="center" px="$6" gap="$2">
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
    return <FullscreenSpinner />
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <YStack f={1} ai="center" jc="center" px="$4" gap="$3">
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
      onComplete={() => {
        void queryClient.invalidateQueries({ queryKey: ['member-approvals', 'pending'] })
        router.back()
      }}
    />
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

export const formatDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}
