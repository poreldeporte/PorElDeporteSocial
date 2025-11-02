import { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

import { greetingRouter } from './greeting'
import { createTRPCRouter } from '../trpc'
export const appRouter = createTRPCRouter({
  greeting: greetingRouter,
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
