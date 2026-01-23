import { pedLogo } from 'app/assets'
import { api } from 'app/utils/api.native'
import { resolveBrandColor } from 'app/utils/brand'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'

export const useBrand = () => {
  const { activeCommunityId, activeCommunity } = useActiveCommunity()
  const { data, isLoading } = api.community.branding.useQuery(
    { communityId: activeCommunityId ?? '' },
    {
      enabled: Boolean(activeCommunityId),
      staleTime: 5 * 60 * 1000,
    }
  )

  const logoUrl = data?.logoUrl?.trim() ? data.logoUrl : activeCommunity?.logoUrl ?? null
  const primaryColor = resolveBrandColor(data?.primaryColor ?? activeCommunity?.primaryColor ?? null)
  const logo = logoUrl ?? pedLogo

  return {
    logo,
    logoUrl,
    primaryColor,
    isLoading,
  }
}
