export type ChatMessage = {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string
  }
}

export type ChatReactionSummary = {
  emoji: string
  count: number
  reactedByCurrentUser: boolean
}
