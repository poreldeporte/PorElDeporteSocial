import { YStack } from '@my/ui/public'
import { Upload } from '@tamagui/lucide-icons'
import { api } from 'app/utils/api'
import { useSupabase } from 'app/utils/supabase/useSupabase'
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
    if (imageAspect > LOGO_ASPECT) {
      cropWidth = image.height * LOGO_ASPECT
    } else {
      cropHeight = image.width / LOGO_ASPECT
    }
    const sx = Math.max(0, (image.width - cropWidth) / 2)
    const sy = Math.max(0, (image.height - cropHeight) / 2)

    canvas.width = LOGO_SIZE
    canvas.height = LOGO_SIZE
    ctx.drawImage(image, sx, sy, cropWidth, cropHeight, 0, 0, LOGO_SIZE, LOGO_SIZE)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', LOGO_QUALITY)
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
      const logoPath = `${communityId}/logo.jpg`
      const result = await supabase.storage.from(LOGO_BUCKET).upload(logoPath, blob, {
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
