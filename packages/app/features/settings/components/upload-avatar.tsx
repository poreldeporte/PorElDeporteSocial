import { YStack } from '@my/ui'
import { Upload } from '@tamagui/lucide-icons'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import { decode } from 'base64-arraybuffer'
import * as ImagePicker from 'expo-image-picker'
import type React from 'react'

export const UploadAvatar = ({ children }: { children: React.ReactNode }) => {
  const { user, updateProfile } = useUser()
  const supabase = useSupabase()
  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      base64: true,
    })

    uploadImage(result)
  }

  const uploadImage = async (pickerResult: ImagePicker.ImagePickerResult) => {
    try {
      if (pickerResult.canceled) {
        // upload canceled
      } else {
        if (!user) return
        const image = pickerResult.assets[0]
        if (!image) {
          throw new Error('No image provided.')
        }

        const base64Image = image.base64

        if (!base64Image) {
          throw new Error('No image provided.')
        }

        const base64Str = base64Image.includes('base64,')
          ? base64Image.substring(base64Image.indexOf('base64,') + 'base64,'.length)
          : base64Image
        const res = decode(base64Str)

        if (!(res.byteLength > 0)) {
          console.error('ArrayBuffer is null')
          return null
        }
        const result = await supabase.storage
          .from('avatars')
          .upload(`${user.id}/${Number(new Date())}.jpeg`, res, {
            contentType: 'image/jpeg',
            upsert: true,
          })
        if (result.error) {
          console.error(result.error)
          throw new Error(result.error.message)
        }

        const publicUrlRes = await supabase.storage
          .from('avatars')
          .getPublicUrl(result.data.path.replace(`avatars/`, ''))

        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrlRes.data.publicUrl })
          .eq('id', user.id)
        await updateProfile()
      }
    } catch (e) {
      console.error(e)

      alert(
        `Upload failed.${
          process.env.NODE_ENV !== 'production'
            ? ' NOTE: Make sure you have created a public bucket with name `avatars`. You can do it either from your Supabase dashboard (http://localhost:54323/project/default/storage/buckets/avatars) or using the seed.sql file.'
            : ''
        }`
      )
    }
  }

  return (
    <YStack pos="relative" als="flex-start" fs={1} onPress={() => pickImage()} cur="pointer">
      {children}
      <YStack fullscreen jc="center" ai="center" zi={100}>
        <YStack bg="black" o={0.3} br="$10" fullscreen />
        <YStack fullscreen jc="center" ai="center">
          <Upload col="white" />
        </YStack>
      </YStack>
    </YStack>
  )
}
