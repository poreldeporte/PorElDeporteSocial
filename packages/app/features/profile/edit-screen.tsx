import {
  Avatar,
  Checkbox,
  FormWrapper,
  FullscreenSpinner,
  Paragraph,
  Label,
  SubmitButton,
  Theme,
  View,
  XStack,
  YStack,
  useToastController,
} from '@my/ui/public'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { UploadAvatar } from '../settings/components/upload-avatar'
import {
  profileUpdateFieldSchema,
  POSITION_OPTIONS,
  type ProfileUpdateFieldValues,
} from './profile-field-schema'

const { useParams } = createParam<{ edit_name?: '1' }>()
export const EditProfileScreen = () => {
  const { profile, user } = useUser()

  if (!profile || !user?.id) {
    return <FullscreenSpinner />
  }
  return (
    <EditProfileForm
      userId={user.id}
      initial={{
        firstName: profile.first_name ?? '',
        lastName: profile.last_name ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        birthDate: profile.birth_date
          ? { dateValue: new Date(profile.birth_date) }
          : undefined,
        jerseyNumber: profile.jersey_number ?? undefined,
        position: profile.position
          ? profile.position.split(',').map((p) => p.trim()).filter(Boolean)
          : [],
      }}
    />
  )
}

const ProfileSchema = profileUpdateFieldSchema

const EditProfileForm = ({
  initial,
  userId,
}: {
  initial: Partial<ProfileUpdateFieldValues>
  userId: string
}) => {
  const { params } = useParams()
  const supabase = useSupabase()
  const toast = useToastController()
  const queryClient = useQueryClient()
  const router = useRouter()
  const apiUtils = api.useUtils()
  const mutation = useMutation({
    async mutationFn(data: ProfileUpdateFieldValues) {
      await supabase
        .from('profiles')
        .update({
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
          phone: data.phone.trim(),
          address: data.address?.trim() || null,
          name: `${data.firstName} ${data.lastName}`.trim(),
          birth_date: formatDateInput(data.birthDate.dateValue),
          jersey_number: data.jerseyNumber,
          position: data.position?.length ? data.position.join(',') : null,
        })
        .eq('id', userId)
    },

    async onSuccess() {
      toast.show('Successfully updated!')
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      await apiUtils.greeting.invalidate()
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
          } as any,
        }}
        defaultValues={{
          firstName: initial.firstName,
          lastName: initial.lastName,
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
              {mutation.isPending ? 'Saving…' : 'Update Profile'}
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
