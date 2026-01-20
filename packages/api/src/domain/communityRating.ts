type TeamSide = 'A' | 'B'

type PlayerInput = {
  profileId: string
  preRating: number
  preRatedGames: number
}

type PlayerDelta = {
  profileId: string
  teamSide: TeamSide
  delta: number
  kUsed: number
}

const BASE_RATING = 1500

const ratingForAverage = ({ preRating, preRatedGames }: PlayerInput) =>
  preRatedGames > 0 ? preRating : BASE_RATING

export const expectedScore = (ra: number, rb: number) => 1 / (1 + 10 ** ((rb - ra) / 400))

export const actualScoreFromGoalDiff = (goalDiff: number) => {
  if (goalDiff > 0) return 1
  if (goalDiff < 0) return 0
  return 0.5
}

export const goalDiffMultiplier = (goalDiff: number) => {
  const abs = Math.abs(goalDiff)
  if (abs <= 2) return 1
  if (abs <= 4) return 1.25
  return 1.5
}

export const kForRatedGames = (ratedGames: number) => (ratedGames < 3 ? 50 : 30)

const averageRating = (players: PlayerInput[]) => {
  if (!players.length) return BASE_RATING
  const total = players.reduce((sum, player) => sum + ratingForAverage(player), 0)
  return total / players.length
}

type DeltaInput = {
  teamA: PlayerInput[]
  teamB: PlayerInput[]
  goalDiff: number
}

type DeltaOutput = {
  teamARating: number
  teamBRating: number
  playerDeltas: PlayerDelta[]
}

export const computeCommunityRatingDeltas = ({ teamA, teamB, goalDiff }: DeltaInput): DeltaOutput => {
  const teamARating = averageRating(teamA)
  const teamBRating = averageRating(teamB)
  const expectedA = expectedScore(teamARating, teamBRating)
  const expectedB = 1 - expectedA
  const actualA = actualScoreFromGoalDiff(goalDiff)
  const actualB = 1 - actualA
  const multiplier = goalDiffMultiplier(goalDiff)

  const teamADeltas = teamA.map((player) => {
    const kUsed = kForRatedGames(player.preRatedGames)
    const delta = kUsed * multiplier * (actualA - expectedA)
    return { profileId: player.profileId, teamSide: 'A' as const, delta, kUsed }
  })

  const teamBDeltas = teamB.map((player) => {
    const kUsed = kForRatedGames(player.preRatedGames)
    const delta = kUsed * multiplier * (actualB - expectedB)
    return { profileId: player.profileId, teamSide: 'B' as const, delta, kUsed }
  })

  return {
    teamARating,
    teamBRating,
    playerDeltas: [...teamADeltas, ...teamBDeltas],
  }
}
