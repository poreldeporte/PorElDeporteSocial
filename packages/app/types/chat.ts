export type ChatMessage = {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string
    avatarUrl?: string | null
  }
}

export type ChatReactionSummary = {
  emoji: string
  count: number
  reactedByCurrentUser: boolean
}
