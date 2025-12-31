import { QueryClient, QueryClientProvider as ClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useSupabase } from 'app/utils/supabase/useSupabase'

export const queryClient = new QueryClient()

export const QueryClientProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClientProvider client={queryClient}>
      <AuthCacheClearer />
      {children}
    </ClientProvider>
  )
}

const AuthCacheClearer = () => {
  const supabase = useSupabase()

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        queryClient.clear()
      }
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [supabase])

  return null
}
