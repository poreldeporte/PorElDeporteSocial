import { useGlobalSearchParams, usePathname } from 'expo-router'

const buildQueryString = (params: Record<string, string | string[] | undefined>) => {
  const pairs: string[] = []
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      return
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(entry)}`)
      })
    }
  })
  return pairs.length ? `?${pairs.join('&')}` : ''
}

export const useCommunityLink = () => {
  const params = useGlobalSearchParams()
  const pathname = usePathname()
  const communityId = typeof params.communityId === 'string' ? params.communityId : null
  const url = `${pathname}${buildQueryString(params as Record<string, string | string[] | undefined>)}`
  return { communityId, url, pathname }
}
