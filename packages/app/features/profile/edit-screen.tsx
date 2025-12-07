import {
  Avatar,
  FormWrapper,
  FullscreenSpinner,
  SubmitButton,
  Theme,
  View,
  YStack,
  useToastController,
} from '@my/ui/public'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SchemaForm } from 'app/utils/SchemaForm'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import { createParam } from 'solito'
import { SolitoImage } from 'solito/image'
import { useRouter } from 'solito/router'

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
        position: profile.position ?? '',
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
          birth_date: data.birthDate.dateValue.toISOString().slice(0, 10),
          jersey_number: data.jerseyNumber,
          position: data.position?.trim() || null,
        })
        .eq('id', userId)
    },

    async onSuccess() {
      toast.show('Successfully updated!')
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      await apiUtils.greeting.invalidate()
      router.back()
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
          position: {
            options: POSITION_OPTIONS.map((option) => ({ name: option, value: option })),
          },
        }}
        defaultValues={{
          firstName: initial.firstName,
          lastName: initial.lastName,
          phone: initial.phone,
          address: initial.address,
          birthDate: initial.birthDate,
          jerseyNumber: initial.jerseyNumber,
          position: initial.position ?? POSITION_OPTIONS[0],
        }}
        onSubmit={(values) => mutation.mutate(values)}
        renderAfter={({ submit }) => (
          <Theme inverse>
            <SubmitButton onPress={() => submit()}>Update Profile</SubmitButton>
          </Theme>
        )}
      >
        {(fields) => (
          <>
            <YStack mb="$4" ai="center">
              <View>
                <UploadAvatar>
                  <UserAvatar />
                </UploadAvatar>
              </View>
            </YStack>
            {Object.values(fields)}
          </>
        )}
      </SchemaForm>
    </FormWrapper>
  )
}

const UserAvatar = () => {
  const { avatarUrl } = useUser()
  return (
    <Avatar circular size={128}>
      <SolitoImage src={avatarUrl} alt="your avatar" width={128} height={128} />
    </Avatar>
  )
}
