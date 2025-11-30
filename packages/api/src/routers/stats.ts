import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, protectedProcedure } from '../trpc'

const leaderboardMetric = z.enum(['overall', 'wins', 'goal_diff', 'captain'])

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export const statsRouter = createTRPCRouter({
  leaderboard: protectedProcedure
    .input(z.object({ metric: leaderboardMetric }).optional())
    .query(async ({ ctx, input }) => {
      const metric = input?.metric ?? 'overall'
      const { data, error } = await (ctx.supabase as any).rpc('get_leaderboard_all_time', {
        p_metric: metric,
      })

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return (data ?? []).map((row: any) => {
        const games = row.games ?? 0
        const wins = row.wins ?? 0
        const losses = row.losses ?? 0
        const goalsFor = row.goals_for ?? 0
        const goalsAgainst = row.goals_against ?? 0
        const goalDiff =
          typeof row.goal_diff === 'number' ? row.goal_diff : goalsFor - goalsAgainst
        const gamesAsCaptain = row.games_as_captain ?? 0
        const winRate = toNumber(row.win_rate)

        return {
          profileId: row.profile_id,
          name: row.name ?? 'Member',
          avatarUrl: row.avatar_url,
          jerseyNumber: row.jersey_number,
          position: row.position,
          games,
          wins,
          losses,
          gamesAsCaptain,
          goalsFor,
          goalsAgainst,
          goalDiff,
          winRate,
          recent: row.recent_outcomes ?? [],
          rank: row.rank ?? 0,
          overallRank: row.overall_rank ?? row.rank ?? 0,
          winsRank: row.wins_rank ?? 0,
          goalDiffRank: row.goal_diff_rank ?? 0,
          captainRank: row.captain_rank ?? 0,
          metric,
        }
      })
    }),

  myStats: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase.rpc('get_player_stats', {
      p_profile_id: ctx.user.id,
    })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    const stats = data?.[0]
    return {
      wins: stats?.wins ?? 0,
      losses: stats?.losses ?? 0,
      games: stats?.games ?? 0,
    }
  }),
})
