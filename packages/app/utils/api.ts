import type { AppRouter } from '@my/api'
import { httpBatchLink } from '@trpc/client'
import { createTRPCNext } from '@trpc/next'
import SuperJSON from 'superjson'

import { getBaseUrl } from './getBaseUrl'

export const api = createTRPCNext<AppRouter>({
  /**
   * @link https://trpc.io/docs/ssr
   **/
  ssr: false,
  transformer: SuperJSON,
  config() {
    return {
      queryClientConfig: {
        // web query config
      },
      links: [
        httpBatchLink({
          transformer: SuperJSON,
          /**
           * If you want to use SSR, you need to use the server's full URL
           * @link https://trpc.io/docs/ssr
           **/
          url: `${getBaseUrl()}/api/trpc`,

          // You can pass any HTTP headers you wish here
          async headers() {
            return {}
          },
        }),
      ],
    }
  },
})

export { type RouterInputs, type RouterOutputs } from '@my/api'
