import { Avatar, SizableText, YStack, getTokens } from '@my/ui/public'

type UserAvatarProps = {
  name?: string | null
  avatarUrl?: string | null
  size?: number | string
  backgroundColor?: string
}

const resolveSizeValue = (size?: number | string) => {
  if (typeof size === 'number') return size
  if (typeof size === 'string') {
    const key = size.replace('$', '')
    const token = getTokens().size[key]
    if (token) return token.val
  }
  return getTokens().size['4'].val
}

const resolveTextSize = (sizeValue: number) => {
  if (sizeValue >= 96) return '$7'
  if (sizeValue >= 72) return '$6'
  if (sizeValue >= 56) return '$5'
  return '$3'
}

const buildInitials = (name?: string | null) => {
  const trimmed = name?.trim() ?? ''
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts[1]?.[0] ?? ''
  return `${first}${last}`.toUpperCase() || '?'
}

export const UserAvatar = ({
  name,
  avatarUrl,
  size = '$3',
  backgroundColor = '$color3',
}: UserAvatarProps) => {
  const sizeValue = resolveSizeValue(size)
  const labelSize = resolveTextSize(sizeValue)
  const initials = buildInitials(name)

  return (
    <Avatar circular size={size} bg={backgroundColor}>
      {avatarUrl ? (
        <Avatar.Image
          source={{
            uri: avatarUrl,
            width: sizeValue,
            height: sizeValue,
          }}
        />
      ) : (
        <YStack f={1} ai="center" jc="center">
          <SizableText size={labelSize} fontWeight="700">
            {initials}
          </SizableText>
        </YStack>
      )}
    </Avatar>
  )
}
