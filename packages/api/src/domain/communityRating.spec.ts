import { describe, expect, it } from 'vitest'

import { computeCommunityRatingDeltas } from './communityRating'

const team = (profileId: string, preRating: number, preRatedGames: number) => [
  { profileId, preRating, preRatedGames },
]

describe('computeCommunityRatingDeltas', () => {
  it('matches the GD=2 example with K=30', () => {
    const { playerDeltas } = computeCommunityRatingDeltas({
      teamA: team('a', 1520, 3),
      teamB: team('b', 1480, 3),
      goalDiff: 2,
    })

    const deltaA = playerDeltas.find((entry) => entry.profileId === 'a')?.delta ?? 0
    expect(deltaA).toBeCloseTo(13.29, 2)
  })

  it('matches the GD=4 example with K=30', () => {
    const { playerDeltas } = computeCommunityRatingDeltas({
      teamA: team('a', 1520, 3),
      teamB: team('b', 1480, 3),
      goalDiff: 4,
    })

    const deltaA = playerDeltas.find((entry) => entry.profileId === 'a')?.delta ?? 0
    expect(deltaA).toBeCloseTo(16.61, 2)
  })

  it('matches the GD=6 example with K=30', () => {
    const { playerDeltas } = computeCommunityRatingDeltas({
      teamA: team('a', 1520, 3),
      teamB: team('b', 1480, 3),
      goalDiff: 6,
    })

    const deltaA = playerDeltas.find((entry) => entry.profileId === 'a')?.delta ?? 0
    expect(deltaA).toBeCloseTo(19.94, 2)
  })

  it('uses K=50 for a player before 3 rated games', () => {
    const { playerDeltas } = computeCommunityRatingDeltas({
      teamA: team('a', 1500, 0),
      teamB: team('b', 1500, 0),
      goalDiff: 1,
    })

    const deltaA = playerDeltas.find((entry) => entry.profileId === 'a')?.delta ?? 0
    expect(deltaA).toBeCloseTo(25, 5)
  })
})
