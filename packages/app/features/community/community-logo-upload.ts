import type { SupabaseClient } from '@supabase/supabase-js'
import type * as ImagePicker from 'expo-image-picker'

import type { Database } from '@my/supabase/types'

const LOGO_SIZE = 512
const LOGO_ASPECT = 1
const LOGO_QUALITY = 0.8
const LOGO_BUCKET = 'community-logos'

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

export const uploadCommunityLogo = async ({
  supabase,
  communityId,
  asset,
}: {
  supabase: SupabaseClient<Database>
  communityId: string
  asset: ImagePicker.ImagePickerAsset
}) => {
  const blob = await resizeImage(asset.uri)

  const logoPath = `${communityId}/logo.jpg`
  const result = await supabase.storage.from(LOGO_BUCKET).upload(logoPath, blob, {
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
