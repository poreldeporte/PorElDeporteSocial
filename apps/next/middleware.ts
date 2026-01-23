import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { PROFILE_COMPLETION_FIELDS, isProfileComplete } from 'app/utils/auth/profileCompletion'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// by default, all routes are protected

// put the public routes here - these will be accessed by both guests and users
const publicRoutes = ['/terms-of-service', '/privacy-policy', '/communities/join']
// put the authentication routes here - these will only be accessed by guests
const authRoutes = ['/sign-in', '/sign-up']
const profileOnboardingRoute = '/onboarding/profile'
const profileReviewRoute = '/onboarding/review'
const communityJoinRoute = '/communities/join'

const withCookies = (source: NextResponse, target: NextResponse) => {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie))
  return target
}

export async function middleware(req: NextRequest) {
  // we need to create a response and hand it to the supabase client to be able to modify the response headers.
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname
  // public routes - no need for Supabase
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return res
  }
  // create authenticated Supabase Client.
  const supabase = createMiddlewareClient({ req, res })
  // check if we have a session
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))
  const isProfileOnboarding = pathname.startsWith(profileOnboardingRoute)
  const isProfileReview = pathname.startsWith(profileReviewRoute)
  const isCommunityJoin = pathname.startsWith(communityJoinRoute)
  if (user) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(PROFILE_COMPLETION_FIELDS)
      .eq('id', user.id)
      .maybeSingle()
    const profileComplete = !error && isProfileComplete(profile)
    const { data: approvedMembership, error: membershipError } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle()
    const hasApprovedMembership = !membershipError && Boolean(approvedMembership)
    if (isAuthRoute) {
      const redirectUrl = req.nextUrl.clone()
      if (!profileComplete) {
        redirectUrl.pathname = profileOnboardingRoute
      } else if (!hasApprovedMembership) {
        redirectUrl.pathname = communityJoinRoute
      } else {
        redirectUrl.pathname = '/'
      }
      return withCookies(res, NextResponse.redirect(redirectUrl))
    }
    if (!profileComplete && !isProfileOnboarding) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = profileOnboardingRoute
      return withCookies(res, NextResponse.redirect(redirectUrl))
    }
    if (profileComplete && !hasApprovedMembership && !isCommunityJoin) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = communityJoinRoute
      return withCookies(res, NextResponse.redirect(redirectUrl))
    }
    if (profileComplete && hasApprovedMembership && (isProfileOnboarding || isProfileReview)) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/'
      return withCookies(res, NextResponse.redirect(redirectUrl))
    }
  }
  // show auth routes for guests
  if (!user && isAuthRoute) {
    return res
  }
  // restrict the user if trying to access protected routes
  if (!user) {
    console.log(`User not logged in. Attempted to access: ${req.nextUrl.pathname}`)
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/sign-in'
    // redirectUrl.searchParams.set(`redirected_from`, req.nextUrl.pathname)
    return withCookies(res, NextResponse.redirect(redirectUrl))
  }
  // show the protected page to logged in route
  return res
}

export const config = {
  // we're only interested in /pages, not assets or api routes
  // so we exclude those here
  matcher: '/((?!api|static|.*\\..*|_next).*)',
}
