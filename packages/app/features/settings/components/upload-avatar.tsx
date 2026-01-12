import { YStack } from '@my/ui/public'
import { Upload } from '@tamagui/lucide-icons'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import * as ImagePicker from 'expo-image-picker'
import type React from 'react'
import { Alert } from 'react-native'
import { useState } from 'react'

const AVATAR_SIZE = 256
const AVATAR_QUALITY = 0.7

type UploadAvatarProps = {
  children: React.ReactNode
  profileId?: string
  avatarUrl?: string | null
  allowRemove?: boolean
  onComplete?: () => void
}

export const UploadAvatar = ({
  children,
  profileId,
  avatarUrl,
  allowRemove = true,
  onComplete,
}: UploadAvatarProps) => {
  const { user, updateProfile } = useUser()
  const supabase = useSupabase()
  const [isBusy, setIsBusy] = useState(false)
  const targetId = profileId ?? user?.id

  const notifyComplete = async () => {
    await onComplete?.()
    if (user?.id && user.id === targetId) {
      await updateProfile()
    }
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    })

    await uploadImage(result)
  }

  const loadImage = (uri: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Unable to load image.'))
      image.src = uri
    })

  const resizeImage = async (uri: string) => {
    if (typeof document === 'undefined') {
      throw new Error('Image processing unavailable.')
    }
    const image = await loadImage(uri)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Image processing unavailable.')
    }
    const size = Math.min(image.width, image.height)
    const sx = Math.max(0, (image.width - size) / 2)
    const sy = Math.max(0, (image.height - size) / 2)
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    ctx.drawImage(image, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', AVATAR_QUALITY)
    )
    if (!blob) {
      throw new Error('No image provided.')
    }
    return blob
  }

  const uploadImage = async (pickerResult: ImagePicker.ImagePickerResult) => {
    if (!targetId) return
    if (pickerResult.canceled) return
    setIsBusy(true)
    try {
      const image = pickerResult.assets[0]
      if (!image) {
        throw new Error('No image provided.')
      }

      const blob = await resizeImage(image.uri)

      const avatarPath = `${targetId}/avatar.jpg`
      const result = await supabase.storage.from('avatars').upload(avatarPath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      })
      if (result.error) {
        console.error(result.error)
        throw new Error(result.error.message)
      }

      const publicUrlRes = await supabase.storage.from('avatars').getPublicUrl(avatarPath)
      const publicUrl = publicUrlRes.data.publicUrl
      const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBustedUrl })
        .eq('id', targetId)
      if (error) {
        throw new Error(error.message)
      }
      await notifyComplete()
    } catch (e) {
      console.error(e)
      alert(
        `Upload failed.${
          process.env.NODE_ENV !== 'production'
            ? ' NOTE: Make sure you have created a public bucket with name `avatars`. You can do it either from your Supabase dashboard (http://localhost:54323/project/default/storage/buckets/avatars) or using the seed.sql file.'
            : ''
        }`
      )
    } finally {
      setIsBusy(false)
    }
  }

  const removeAvatar = async () => {
    if (!targetId) return
    setIsBusy(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', targetId)
      if (error) {
        throw new Error(error.message)
      }
      await supabase.storage.from('avatars').remove([`${targetId}/avatar.jpg`])
      await notifyComplete()
    } catch (e) {
      console.error(e)
      alert('Unable to remove photo.')
    } finally {
      setIsBusy(false)
    }
  }

  const handlePress = () => {
    if (!targetId || isBusy) return
    const actions = [
      { text: 'Change photo', onPress: () => void pickImage() },
      allowRemove && avatarUrl
        ? { text: 'Remove photo', style: 'destructive', onPress: () => void removeAvatar() }
        : null,
      { text: 'Cancel', style: 'cancel' },
    ].filter(Boolean) as { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[]

    Alert.alert('Profile photo', 'Update the avatar for this member.', actions)
  }

  return (
    <YStack pos="relative" als="center" fs={1} onPress={handlePress} cur="pointer">
      {children}
      <YStack
        position="absolute"
        bottom={6}
        right={6}
        w={28}
        h={28}
        br={14}
        ai="center"
        jc="center"
        bg="$color10"
        borderWidth={1}
        borderColor="$color8"
      >
        <Upload size={14} color="$color1" />
      </YStack>
    </YStack>
  )
}
