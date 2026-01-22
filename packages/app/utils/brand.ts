import { BRAND_COLORS } from 'app/constants/colors'

const HEX_COLOR = /^#?[0-9a-fA-F]{6}$/
const HEX_COLOR_NORMALIZED = /^#[0-9a-fA-F]{6}$/

export const normalizeHexColor = (value?: string | null) => {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  if (!HEX_COLOR.test(withHash)) return withHash
  return withHash.toUpperCase()
}

export const isValidHexColor = (value?: string | null) => {
  if (!value) return false
  return HEX_COLOR_NORMALIZED.test(value)
}

export const resolveBrandColor = (value?: string | null) => {
  const normalized = normalizeHexColor(value)
  if (normalized && isValidHexColor(normalized)) return normalized
  return BRAND_COLORS.primary
}
