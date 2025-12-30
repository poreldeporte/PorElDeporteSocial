import {
  Avatar,
  Button,
  Checkbox,
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
}

export const ProfileFormScreen = ({ submitLabel, onComplete }: ProfileFormScreenProps) => {
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
      onComplete={onComplete}
    />
  )
}

const EditProfileForm = ({
  initial,
  userId,
  submitLabel = 'Update Profile',
  approvalStatus,
  onComplete,
}: {
  initial: ProfileFormInitial
  userId: string
  submitLabel?: string
  approvalStatus: 'draft' | 'pending' | 'approved'
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

  return (
    <FormWrapper>
      <SchemaForm
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
            <SubmitButton disabled={mutation.isPending} onPress={() => submit()}>
              {mutation.isPending ? 'Saving…' : submitLabel}
            </SubmitButton>
          </Theme>
        )}
      >
        {(fields) => (
          <>
            <YStack mb="$4" ai="center">
              <View>
                <UserAvatar />
              </View>
            </YStack>
            <YStack gap="$3">
              {fields.firstName}
              {fields.lastName}
              {fields.email}
              {fields.phone}
              <PositionCheckboxes />
              {fields.jerseyNumber}
              {fields.birthDate}
              {fields.address}
            </YStack>
          </>
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
  const { watch, setValue } = useFormContext<ProfileUpdateFieldValues>()
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
