export const nextSnakeTurn = (currentTurn: number, direction: number, teamCount: number) => {
  if (teamCount <= 0) return { nextTurn: 0, nextDirection: direction }

  let nextTurn = currentTurn + direction
  let nextDirection = direction

  const lastIndex = teamCount - 1
  if (nextTurn > lastIndex) {
    nextTurn = lastIndex
    nextDirection = -1
  } else if (nextTurn < 0) {
    nextTurn = 0
    nextDirection = 1
  }

  return { nextTurn, nextDirection }
}

const ORIGINAL_PICK_SEQUENCE = [0, 1, 0, 1, 0, 1, 1, 0, 1, 0]

export const nextOriginalTurn = (currentPickOrder: number, teamCount: number) => {
  if (teamCount !== 2) {
    return { nextTurn: 0, nextDirection: 1 }
  }
  const nextIndex = currentPickOrder
  if (nextIndex < 0 || nextIndex >= ORIGINAL_PICK_SEQUENCE.length) {
    return { nextTurn: null, nextDirection: 1 }
  }
  return { nextTurn: ORIGINAL_PICK_SEQUENCE[nextIndex], nextDirection: 1 }
}

export const originalTurnForPick = (pickOrder: number, teamCount: number) => {
  if (teamCount !== 2) return null
  const index = pickOrder - 1
  if (index < 0 || index >= ORIGINAL_PICK_SEQUENCE.length) return null
  return ORIGINAL_PICK_SEQUENCE[index]
}

export const undoPayload = (payload: Record<string, unknown> | null | undefined, userId: string) => ({
  ...(payload ?? {}),
  undone: true,
  undoneBy: userId,
  undoneAt: new Date().toISOString(),
})

export const shuffleOrder = <T>(items: T[], rng: () => number = Math.random) => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
