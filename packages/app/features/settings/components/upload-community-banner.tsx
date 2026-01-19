import { YStack } from '@my/ui/public'
import { Upload } from '@tamagui/lucide-icons'
import { api } from 'app/utils/api'
import { useSupabase } from 'app/utils/supabase/useSupabase'
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

    const imageAspect = image.width / image.height
    let cropWidth = image.width
    let cropHeight = image.height
    if (imageAspect > BANNER_ASPECT) {
      cropWidth = image.height * BANNER_ASPECT
    } else {
      cropHeight = image.width / BANNER_ASPECT
    }
    const sx = Math.max(0, (image.width - cropWidth) / 2)
    const sy = Math.max(0, (image.height - cropHeight) / 2)

    canvas.width = BANNER_WIDTH
    canvas.height = BANNER_HEIGHT
    ctx.drawImage(image, sx, sy, cropWidth, cropHeight, 0, 0, BANNER_WIDTH, BANNER_HEIGHT)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', BANNER_QUALITY)
    )
    if (!blob) {
      throw new Error('No image provided.')
    }
    return blob
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

      const blob = await resizeImage(image.uri)
      const bannerPath = `${communityId}/banner.jpg`
      const result = await supabase.storage.from(BANNER_BUCKET).upload(bannerPath, blob, {
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
