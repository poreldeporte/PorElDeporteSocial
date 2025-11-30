import type { RouterOutputs } from 'app/utils/api'

export type GameDetail = RouterOutputs['games']['byId']
export type QueueEntry = GameDetail['queue'][number] & {
  record?: {
    wins: number
    losses: number
    recent: string[]
  }
}
export type GameListItem = RouterOutputs['games']['list'][number]
export type GameStatus = GameDetail['status']
