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

const BANNER_WIDTH = 1200
const BANNER_HEIGHT = 600
const BANNER_ASPECT = BANNER_WIDTH / BANNER_HEIGHT
const BANNER_QUALITY = 0.7
const BANNER_BUCKET = 'community-banners'

type UploadCommunityBannerProps = {
  children: React.ReactNode
  communityId?: string | null
  onComplete?: () => void
}

const getCropRect = (width: number, height: number) => {
  const imageAspect = width / height
  if (imageAspect > BANNER_ASPECT) {
    const cropWidth = height * BANNER_ASPECT
    return {
      originX: Math.max(0, (width - cropWidth) / 2),
      originY: 0,
      width: cropWidth,
      height,
    }
  }
  const cropHeight = width / BANNER_ASPECT
  return {
    originX: 0,
    originY: Math.max(0, (height - cropHeight) / 2),
    width,
    height: cropHeight,
  }
}

export const UploadCommunityBanner = ({
  children,
  communityId,
  onComplete,
}: UploadCommunityBannerProps) => {
  const supabase = useSupabase()
  const apiUtils = api.useUtils()
  const [isBusy, setIsBusy] = useState(false)

  const mutation = api.community.updateDefaults.useMutation({
    onSuccess: (data) => {
      apiUtils.community.defaults.setData(undefined, data)
      onComplete?.()
    },
  })

  const notifyError = (message: string) => {
    alert(
      `${message}${
        process.env.NODE_ENV !== 'production'
          ? ` NOTE: Ensure the "${BANNER_BUCKET}" bucket exists and is public.`
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
      actions.push({ resize: { width: BANNER_WIDTH, height: BANNER_HEIGHT } })

      const resized = await ImageManipulator.manipulateAsync(image.uri, actions, {
        compress: BANNER_QUALITY,
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

      const bannerPath = `${communityId}/banner.jpg`
      const result = await supabase.storage.from(BANNER_BUCKET).upload(bannerPath, res, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      })
      if (result.error) {
        console.error(result.error)
        throw new Error(result.error.message)
      }

      const publicUrlRes = await supabase.storage.from(BANNER_BUCKET).getPublicUrl(bannerPath)
      const publicUrl = publicUrlRes.data.publicUrl
      const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`

      await mutation.mutateAsync({ communityBannerUrl: cacheBustedUrl })
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
      aspect: [2, 1],
      quality: 1,
    })

    await uploadImage(result)
  }

  const handlePress = () => {
    if (!communityId || isBusy || mutation.isPending) return
    Alert.alert('Community banner', 'Update the banner for this community.', [
      { text: 'Change banner', onPress: () => void pickImage() },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return (
    <YStack pos="relative" w="100%" onPress={handlePress} cur="pointer">
      {children}
      <YStack
        position="absolute"
        bottom={10}
        right={10}
        w={32}
        h={32}
        br={16}
        ai="center"
        jc="center"
        bg="$color10"
        borderWidth={1}
        borderColor="$color8"
      >
        <Upload size={16} color="$color1" />
      </YStack>
    </YStack>
  )
}
