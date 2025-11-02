import { QueryClient, QueryClientProvider as ClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export const QueryClientProvider = ({ children }: { children: React.ReactNode }) => {
  return <ClientProvider client={queryClient}>{children}</ClientProvider>
}
