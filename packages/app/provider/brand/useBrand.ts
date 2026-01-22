import { pedLogo } from 'app/assets'
import { resolveBrandColor } from 'app/utils/brand'
import { api } from 'app/utils/api'

export const useBrand = () => {
  const { data, isLoading } = api.community.branding.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  })

  const logoUrl = data?.logoUrl?.trim() ? data.logoUrl : null
  const primaryColor = resolveBrandColor(data?.primaryColor ?? null)
  const logo = logoUrl ?? pedLogo

  return {
    logo,
    logoUrl,
    primaryColor,
    isLoading,
  }
}
