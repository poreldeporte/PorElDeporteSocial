import type { AppRouter } from '@my/api'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import SuperJSON from 'superjson'

import { getBaseUrl } from './getBaseUrl'
import { supabase } from './supabase/client.native'

export const api = createTRPCReact<AppRouter>()
export const createTrpcClient = () =>
  api.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: SuperJSON,
        async headers() {
          const headers = new Map<string, string>()
          headers.set('x-trpc-source', 'expo-react')
          const session = (await supabase.auth.getSession()).data.session

          // Manually add the auth name as the backend uses cookies to authenticate users
          // This allows mobile to authenticate via Supabase
          if (session?.access_token) {
            headers.set('Authorization', `Bearer ${session.access_token}`)
          }
          return Object.fromEntries(headers)
        },
      }),
    ],
  })

export { type RouterInputs, type RouterOutputs } from '@my/api'
