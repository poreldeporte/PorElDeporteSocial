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

export const undoPayload = (payload: Record<string, unknown> | null | undefined, userId: string) => ({
  ...(payload ?? {}),
  undone: true,
  undoneBy: userId,
  undoneAt: new Date().toISOString(),
})
