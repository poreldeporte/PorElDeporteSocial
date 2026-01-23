import type { SupabaseClient } from '@supabase/supabase-js'
import type * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { decode } from 'base64-arraybuffer'

import type { Database } from '@my/supabase/types'

const LOGO_SIZE = 512
const LOGO_ASPECT = 1
const LOGO_QUALITY = 0.8
const LOGO_BUCKET = 'community-logos'

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

export const uploadCommunityLogo = async ({
  supabase,
  communityId,
  asset,
}: {
  supabase: SupabaseClient<Database>
  communityId: string
  asset: ImagePicker.ImagePickerAsset
}) => {
  const actions: ImageManipulator.Action[] = []
  if (asset.width && asset.height) {
    actions.push({ crop: getCropRect(asset.width, asset.height) })
  }
  actions.push({ resize: { width: LOGO_SIZE, height: LOGO_SIZE } })

  const resized = await ImageManipulator.manipulateAsync(asset.uri, actions, {
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
    throw new Error(result.error.message)
  }

  const publicUrlRes = await supabase.storage.from(LOGO_BUCKET).getPublicUrl(logoPath)
  const publicUrl = publicUrlRes.data.publicUrl
  return `${publicUrl}?v=${Date.now()}`
}
