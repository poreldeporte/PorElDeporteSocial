import { YStack } from '@my/ui/public'
import { Upload } from '@tamagui/lucide-icons'
import { api } from 'app/utils/api'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { decode } from 'base64-arraybuffer'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import type React from 'react'
import { Alert } from 'react-native'
import { useState } from 'react'

const LOGO_SIZE = 512
const LOGO_ASPECT = 1
const LOGO_QUALITY = 0.8
const LOGO_BUCKET = 'community-logos'

type UploadCommunityLogoProps = {
  children: React.ReactNode
  communityId?: string | null
  onComplete?: () => void
}

const getCropRect = (width: number, height: number) => {
  const imageAspect = width / height
  if (imageAspect > LOGO_ASPECT) {
    const cropWidth = height * LOGO_ASPECT
    return {
      originX: Math.max(0, (width - cropWidth) / 2),
      originY: 0,
      width: cropWidth,
      height,
    }
  }
  const cropHeight = width / LOGO_ASPECT
  return {
    originX: 0,
    originY: Math.max(0, (height - cropHeight) / 2),
    width,
    height: cropHeight,
  }
}

export const UploadCommunityLogo = ({
  children,
  communityId,
  onComplete,
}: UploadCommunityLogoProps) => {
  const supabase = useSupabase()
  const apiUtils = api.useUtils()
  const [isBusy, setIsBusy] = useState(false)

  const mutation = api.community.updateDefaults.useMutation({
    onSuccess: (data) => {
      if (!communityId) return
      apiUtils.community.defaults.setData({ communityId }, data)
      apiUtils.community.branding.setData(
        { communityId },
        {
          logoUrl: data.logoUrl ?? null,
          primaryColor: data.primaryColor ?? null,
        }
      )
      onComplete?.()
    },
  })

  const notifyError = (message: string) => {
    alert(
      `${message}${
        process.env.NODE_ENV !== 'production'
          ? ` NOTE: Ensure the "${LOGO_BUCKET}" bucket exists and is public.`
          : ''
      }`
    )
  }

  const uploadImage = async (pickerResult: ImagePicker.ImagePickerResult) => {
    if (!communityId) return
    if (pickerResult.canceled) return
    setIsBusy(true)
    try {
      const image = pickerResult.assets[0]
      if (!image) {
        throw new Error('No image provided.')
      }

      const actions: ImageManipulator.Action[] = []
      if (image.width && image.height) {
        actions.push({ crop: getCropRect(image.width, image.height) })
      }
      actions.push({ resize: { width: LOGO_SIZE, height: LOGO_SIZE } })

      const resized = await ImageManipulator.manipulateAsync(image.uri, actions, {
        compress: LOGO_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      })

      const base64Image = resized.base64
      if (!base64Image) {
        throw new Error('No image provided.')
      }

      const base64Str = base64Image.includes('base64,')
        ? base64Image.substring(base64Image.indexOf('base64,') + 'base64,'.length)
        : base64Image
      const res = decode(base64Str)

      if (!(res.byteLength > 0)) {
        throw new Error('No image provided.')
      }

      const logoPath = `${communityId}/logo.jpg`
      const result = await supabase.storage.from(LOGO_BUCKET).upload(logoPath, res, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      })
      if (result.error) {
        console.error(result.error)
        throw new Error(result.error.message)
      }

      const publicUrlRes = await supabase.storage.from(LOGO_BUCKET).getPublicUrl(logoPath)
      const publicUrl = publicUrlRes.data.publicUrl
      const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`

      await mutation.mutateAsync({ communityId, communityLogoUrl: cacheBustedUrl })
    } catch (e) {
      console.error(e)
      notifyError('Upload failed.')
    } finally {
      setIsBusy(false)
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

  const handlePress = () => {
    if (!communityId || isBusy || mutation.isPending) return
    Alert.alert('Community logo', 'Update the logo for this community.', [
      { text: 'Change logo', onPress: () => void pickImage() },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return (
    <YStack pos="relative" onPress={handlePress} cur="pointer">
      {children}
      <YStack
        position="absolute"
        bottom={2}
        right={2}
        w={24}
        h={24}
        br={12}
        ai="center"
        jc="center"
        bg="$color10"
        borderWidth={1}
        borderColor="$color8"
      >
        <Upload size={12} color="$color1" />
      </YStack>
    </YStack>
  )
}
