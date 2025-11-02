import { appRouter, createTRPCContext } from '@my/api'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { ServerRuntime } from 'next'

export const runtime: ServerRuntime = 'edge'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  })
export { handler as GET, handler as POST }
