export const CHAT_BROADCAST_EVENT = 'message'
export const CHAT_REACTION_EVENT = 'reaction'
export const CHAT_DELETE_EVENT = 'delete'
export const CHAT_MESSAGE_MAX_LENGTH = 400
export const CHAT_REACTION_EMOJIS = ['👍', '❤️', '😂', '🙌', '🔥'] as const

export const getGameChatRoomName = (gameId: string) => `chat:game:${gameId}`
export const getDraftChatRoomName = (gameId: string) => `chat:draft:${gameId}`
export const COMMUNITY_CHAT_ROOM = 'chat:community:lobby'

export const formatChatTimestamp = (isoDate: string) => {
  const date = new Date(isoDate)
  const fallback = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (Number.isNaN(date.getTime())) return fallback
  return fallback
}
