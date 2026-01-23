import { api } from 'app/utils/api'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'

export const useMyStats = () => {
  const { activeCommunityId } = useActiveCommunity()
  const query = api.stats.myStats.useQuery(
    { communityId: activeCommunityId ?? '' },
    { enabled: Boolean(activeCommunityId) }
  )
  return {
    stats: query.data ?? { wins: 0, losses: 0, games: 0 },
    isLoading: query.isLoading,
  }
}
