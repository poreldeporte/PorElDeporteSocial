import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'

import { api } from 'app/utils/api'
import { useCommunityLink } from 'app/utils/useCommunityLink'
import { useSessionContext } from 'app/utils/supabase/useSessionContext'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useAppRouter } from 'app/utils/useAppRouter'

type MembershipStatus = 'pending' | 'approved' | 'rejected'
type MembershipRole = 'owner' | 'admin' | 'member'

type CommunitySummary = {
  id: string
  name: string
  city?: string | null
  state?: string | null
  sport?: string | null
  sports?: string[] | null
  description?: string | null
  logoUrl: string | null
  primaryColor: string | null
  archivedAt: string | null
  memberCount: number
}

type CommunityMembership = {
  id: string
  communityId: string
  role: MembershipRole
  status: MembershipStatus
  requestedAt: string | null
  community: CommunitySummary | null
}

type CommunityContextValue = {
  memberships: CommunityMembership[]
  approvedMemberships: CommunityMembership[]
  pendingMemberships: CommunityMembership[]
  activeCommunityId: string | null
  activeMembership: CommunityMembership | null
  activeCommunity: CommunitySummary | null
  favoriteCommunityId: string | null
  hasApprovedMembership: boolean
  isLoading: boolean
  pendingRoute: { url: string; communityId: string } | null
  setActiveCommunityId: (communityId: string) => void
  setFavoriteCommunityId: (communityId: string) => Promise<void>
  setPendingRoute: (route: { url: string; communityId: string } | null) => void
  refresh: () => Promise<void>
}

export const CommunityContext = createContext<CommunityContextValue | null>(null)

export const CommunityProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useSessionContext()
  const userId = session?.user?.id ?? null
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  const router = useAppRouter()
  const { communityId: linkCommunityId, url: linkUrl, pathname } = useCommunityLink()

  const membershipsQuery = api.members.myMemberships.useQuery(undefined, {
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  })

  const favoriteQuery = useQuery({
    queryKey: ['profile', userId, 'favorite-community'],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('favorite_community_id')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data?.favorite_community_id ?? null
    },
    enabled: Boolean(userId),
  })

  const memberships = useMemo(
    () => (membershipsQuery.data ?? []) as CommunityMembership[],
    [membershipsQuery.data]
  )

  const approvedMemberships = useMemo(
    () => memberships.filter((membership) => membership.status === 'approved'),
    [memberships]
  )

  const pendingMemberships = useMemo(
    () => memberships.filter((membership) => membership.status === 'pending'),
    [memberships]
  )

  const [activeCommunityId, setActiveCommunityIdState] = useState<string | null>(null)
  const [pendingRoute, setPendingRoute] = useState<{ url: string; communityId: string } | null>(
    null
  )

  const favoriteCommunityId = favoriteQuery.data ?? null

  const updateFavoriteMutation = useMutation({
    mutationFn: async (communityId: string) => {
      if (!userId) throw new Error('Missing user')
      const { error } = await supabase
        .from('profiles')
        .update({ favorite_community_id: communityId })
        .eq('id', userId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', userId, 'favorite-community'] })
    },
  })

  const setFavoriteCommunityId = useCallback(
    async (communityId: string) => {
      const membership = memberships.find((item) => item.communityId === communityId)
      if (!membership || membership.status !== 'approved') return
      await updateFavoriteMutation.mutateAsync(communityId)
    },
    [memberships, updateFavoriteMutation]
  )

  useEffect(() => {
    if (!userId) {
      setActiveCommunityIdState(null)
      return
    }
    const approvedIds = approvedMemberships.map((membership) => membership.communityId)
    const favoriteApproved = favoriteCommunityId
      ? approvedIds.includes(favoriteCommunityId)
      : false

    const nextActive = (() => {
      if (activeCommunityId && approvedIds.includes(activeCommunityId)) return activeCommunityId
      if (favoriteApproved && favoriteCommunityId) return favoriteCommunityId
      return approvedMemberships[0]?.communityId ?? null
    })()

    if (nextActive !== activeCommunityId) {
      setActiveCommunityIdState(nextActive)
    }
  }, [
    activeCommunityId,
    approvedMemberships,
    favoriteCommunityId,
    userId,
  ])

  useEffect(() => {
    if (!userId) return
    if (approvedMemberships.length === 0) return
    const approvedIds = approvedMemberships.map((membership) => membership.communityId)
    if (favoriteCommunityId && approvedIds.includes(favoriteCommunityId)) return
    const fallback = approvedMemberships[0]?.communityId
    if (!fallback || favoriteCommunityId === fallback) return
    void updateFavoriteMutation.mutateAsync(fallback)
  }, [approvedMemberships, favoriteCommunityId, updateFavoriteMutation, userId])

  const setActiveCommunityId = useCallback(
    (communityId: string) => {
      const membership = memberships.find((item) => item.communityId === communityId)
      if (!membership || membership.status !== 'approved') return
      setActiveCommunityIdState(communityId)
    },
    [memberships]
  )

  const activeMembership = useMemo(() => {
    if (!activeCommunityId) return null
    return memberships.find((membership) => membership.communityId === activeCommunityId) ?? null
  }, [activeCommunityId, memberships])

  const activeCommunity = activeMembership?.community ?? null

  const hasApprovedMembership = approvedMemberships.length > 0
  const isLoading = membershipsQuery.isLoading || favoriteQuery.isLoading

  const refresh = useCallback(async () => {
    await Promise.all([membershipsQuery.refetch(), favoriteQuery.refetch()])
  }, [membershipsQuery, favoriteQuery])

  useEffect(() => {
    if (!linkCommunityId) return
    const membership = memberships.find((item) => item.communityId === linkCommunityId)
    if (membership?.status === 'approved') {
      setActiveCommunityId(linkCommunityId)
      return
    }
    if (!pendingRoute || pendingRoute.communityId !== linkCommunityId || pendingRoute.url !== linkUrl) {
      setPendingRoute({ url: linkUrl, communityId: linkCommunityId })
    }
    if (pathname !== '/communities/join') {
      router.push('/communities/join')
    }
  }, [
    linkCommunityId,
    linkUrl,
    memberships,
    pathname,
    pendingRoute,
    router,
    setActiveCommunityId,
    setPendingRoute,
  ])

  useEffect(() => {
    if (!pendingRoute) return
    const approved = approvedMemberships.some(
      (membership) => membership.communityId === pendingRoute.communityId
    )
    if (!approved) return
    setActiveCommunityId(pendingRoute.communityId)
    router.push(pendingRoute.url)
    setPendingRoute(null)
  }, [approvedMemberships, pendingRoute, router, setActiveCommunityId])

  const value = useMemo<CommunityContextValue>(
    () => ({
      memberships,
      approvedMemberships,
      pendingMemberships,
      activeCommunityId,
      activeMembership,
      activeCommunity,
      favoriteCommunityId,
      hasApprovedMembership,
      isLoading,
      pendingRoute,
      setActiveCommunityId,
      setFavoriteCommunityId,
      setPendingRoute,
      refresh,
    }),
    [
      memberships,
      approvedMemberships,
      pendingMemberships,
      activeCommunityId,
      activeMembership,
      activeCommunity,
      favoriteCommunityId,
      hasApprovedMembership,
      isLoading,
      pendingRoute,
      setActiveCommunityId,
      setFavoriteCommunityId,
      setPendingRoute,
      refresh,
    ]
  )

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>
}
