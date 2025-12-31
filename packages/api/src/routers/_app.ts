import { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

import { createTRPCRouter } from '../trpc'
import { gamesRouter } from './games'
import { greetingRouter } from './greeting'
import { queueRouter } from './queue'
import { teamsRouter } from './teams'
import { chatRouter } from './chat'
import { authRouter } from './auth'
import { statsRouter } from './stats'
import { notificationsRouter } from './notifications'
export const appRouter = createTRPCRouter({
  greeting: greetingRouter,
  games: gamesRouter,
  queue: queueRouter,
  teams: teamsRouter,
  chat: chatRouter,
  auth: authRouter,
  stats: statsRouter,
  notifications: notificationsRouter,
})
// export type definition of API
export type AppRouter = typeof appRouter

/**
 * Inference helpers for input types
 * @example type HelloInput = RouterInputs['example']['hello']
 **/
export type RouterInputs = inferRouterInputs<AppRouter>

/**
 * Inference helpers for output types
 * @example type HelloOutput = RouterOutputs['example']['hello']
 **/
export type RouterOutputs = inferRouterOutputs<AppRouter>
