import type { Session, SessionContext as SessionContextHelper } from '@supabase/auth-helpers-react'
import { AuthError } from '@supabase/supabase-js'
import { supabase } from 'app/utils/supabase/client.native'
import { createContext, useEffect, useState } from 'react'

import type { AuthProviderProps } from './AuthProvider'
import { AuthStateChangeHandler } from './AuthStateChangeHandler'

export const SessionContext = createContext<SessionContextHelper>({
  session: null,
  error: null,
  isLoading: false,
  supabaseClient: supabase,
})

export const AuthProvider = ({ children, initialSession }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(initialSession || null)
  const [error, setError] = useState<AuthError | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  useEffect(() => {
    setIsLoading(true)
    supabase.auth
      .getSession()
      .then(({ data: { session: newSession } }) => {
        setSession(newSession)
      })
      .catch((error) => setError(new AuthError(error.message)))
      .finally(() => setIsLoading(false))
  }, [])
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <SessionContext.Provider
      value={
        session
          ? {
              session,
              isLoading: false,
              error: null,
              supabaseClient: supabase,
            }
          : error
          ? {
              error,
              isLoading: false,
              session: null,
              supabaseClient: supabase,
            }
          : {
              error: null,
              isLoading,
              session: null,
              supabaseClient: supabase,
            }
      }
    >
      <AuthStateChangeHandler />
      {children}
    </SessionContext.Provider>
  )
}
