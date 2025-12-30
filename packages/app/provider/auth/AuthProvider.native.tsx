import type { Session, SessionContext as SessionContextHelper } from '@supabase/auth-helpers-react'
import { AuthError, type User } from '@supabase/supabase-js'
import { PROFILE_APPROVAL_FIELDS, isProfileApproved } from 'app/utils/auth/profileApproval'
import { PROFILE_COMPLETION_FIELDS, isProfileComplete } from 'app/utils/auth/profileCompletion'
import { supabase } from 'app/utils/supabase/client.native'
import { router, useSegments } from 'expo-router'
import { createContext, useEffect, useState } from 'react'
import { Platform } from 'react-native'

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
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('unknown')
  useProtectedRoute(session?.user ?? null, profileStatus)
  useEffect(() => {
    let active = true
    if (!session?.user?.id) {
      setProfileStatus('unknown')
      return () => {
        active = false
      }
    }
    setProfileStatus('loading')
    supabase
      .from('profiles')
      .select(`${PROFILE_COMPLETION_FIELDS},${PROFILE_APPROVAL_FIELDS}`)
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error || !isProfileComplete(data)) {
          setProfileStatus('incomplete')
          return
        }
        if (!isProfileApproved(data)) {
          setProfileStatus('pending')
          return
        }
        setProfileStatus('approved')
      })
      .catch(() => {
        if (!active) return
        setProfileStatus('incomplete')
      })
    return () => {
      active = false
    }
  }, [session?.user?.id])
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

type ProfileStatus = 'unknown' | 'loading' | 'incomplete' | 'pending' | 'approved'

export function useProtectedRoute(user: User | null, profileStatus: ProfileStatus) {
  const segments = useSegments()

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)'
    const inProfileOnboarding = segments[0] === 'onboarding' && segments[1] === 'profile'
    const inProfileReview = segments[0] === 'onboarding' && segments[1] === 'review'
    const publicRoutes = ['terms-of-service', 'privacy-policy']
    const inPublicRoute = publicRoutes.includes(segments[0] ?? '')

    if (
      // If the user is not signed in and the initial segment is not anything in the auth group.
      !user &&
      !inAuthGroup &&
      !inPublicRoute
    ) {
      // Redirect to the sign-in page.
      replaceRoute('/onboarding')
      return
    }
    if (!user) return
    if (inPublicRoute) return
    if (profileStatus === 'incomplete' && !inProfileOnboarding && !inProfileReview) {
      replaceRoute('/onboarding/profile')
      return
    }
    if (profileStatus === 'pending' && !inProfileReview && !inProfileOnboarding) {
      replaceRoute('/onboarding/review')
      return
    }
    if (profileStatus === 'approved' && (inProfileOnboarding || inProfileReview)) {
      replaceRoute('/')
      return
    }
    if (profileStatus === 'approved' && inAuthGroup) {
      replaceRoute('/')
    }
  }, [user, segments, profileStatus])
}

/**
 * temporary fix
 *
 * see https://github.com/expo/router/issues/740
 * see https://github.com/expo/router/issues/745
 *  */
const replaceRoute = (href: string) => {
  if (Platform.OS === 'ios') {
    setTimeout(() => {
      router.replace(href)
    }, 1)
  } else {
    setTimeout(() => {
      router.replace(href)
    }, 1)
  }
}
