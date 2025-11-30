import { api } from 'app/utils/api'

export const useMyStats = () => {
  const query = api.stats.myStats.useQuery()
  return {
    stats: query.data ?? { wins: 0, losses: 0, games: 0 },
    isLoading: query.isLoading,
  }
}
