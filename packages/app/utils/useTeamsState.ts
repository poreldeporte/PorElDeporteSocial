import { useCallback, useEffect, useMemo, useRef } from 'react'

import { REALTIME_DRAFT_REFETCH_DELAY_MS } from 'app/constants/realtime'
import { api } from './api'
import { useRealtimeChannel } from './useRealtimeChannel'
import { useUser } from './useUser'

type TeamsStateProps = {
  gameId?: string
}

export const useTeamsState = ({ gameId }: TeamsStateProps = {}) => {
  const utils = api.useUtils()
  const { user, isAdmin } = useUser()
  const query = api.teams.state.useQuery(
    { gameId: gameId! },
    {
      enabled: Boolean(gameId),
    }
  )

  const { game, teams, captainTeamId, currentTurnTeamId, isCaptainTurn, events } = query.data ?? {
    game: null,
    teams: [],
    captainTeamId: null,
    currentTurnTeamId: null,
    isCaptainTurn: false,
    events: [],
  }

  const draftedPlayerIds = useMemo(() => {
    const ids = teams.flatMap(
      (team) =>
        team.game_team_members
          ?.map((member) => member.profile_id ?? member.guest_queue_id)
          .filter(Boolean) ?? []
    )
    return new Set(ids)
  }, [teams])

  const captainTeam = useMemo(() => {
    if (captainTeamId) {
      const match = teams.find((team) => team.id === captainTeamId)
      if (match) return match
    }
    return teams.find((team) => team.captain_profile_id === user?.id) ?? null
  }, [teams, captainTeamId, user?.id])

  const currentTurnTeam = useMemo(
    () => (currentTurnTeamId ? teams.find((team) => team.id === currentTurnTeamId) ?? null : null),
    [currentTurnTeamId, teams]
  )

  const refetch = useCallback(() => {
    if (!gameId) return Promise.resolve()
    return utils.teams.state.invalidate({ gameId })
  }, [utils, gameId])

  const refetchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const scheduleRefetch = useCallback(() => {
    if (refetchTimerRef.current) return
    refetchTimerRef.current = setTimeout(() => {
      void refetch()
      refetchTimerRef.current = null
    }, REALTIME_DRAFT_REFETCH_DELAY_MS)
  }, [refetch])

  useEffect(() => {
    return () => {
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current)
        refetchTimerRef.current = null
      }
    }
  }, [])

  const teamIds = useMemo(() => teams.map((team) => team.id).filter(Boolean), [teams])

  const draftMetaHandler = useCallback(
    (channel) => {
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
          scheduleRefetch
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_teams', filter: `game_id=eq.${gameId}` },
          scheduleRefetch
        )
    },
    [gameId, scheduleRefetch]
  )

  useRealtimeChannel(
    gameId ? `game:${gameId}:draft-meta` : null,
    draftMetaHandler,
    { enabled: Boolean(gameId), onError: scheduleRefetch }
  )

  const membersFilter = useMemo(() => {
    if (!teamIds.length) return null
    return `game_team_id=in.(${teamIds.join(',')})`
  }, [teamIds])

  const membersHandler = useCallback(
    (channel) => {
      if (!membersFilter) return
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_team_members', filter: membersFilter },
        scheduleRefetch
      )
    },
    [membersFilter, scheduleRefetch]
  )

  useRealtimeChannel(
    membersFilter ? `game:${gameId}:team-members` : null,
    membersHandler,
    { enabled: Boolean(gameId && membersFilter), onError: scheduleRefetch }
  )

  const eventsHandler = useCallback(
    (channel) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_draft_events', filter: `game_id=eq.${gameId}` },
        scheduleRefetch
      )
    },
    [gameId, scheduleRefetch]
  )

  useRealtimeChannel(
    gameId ? `game:${gameId}:draft-events` : null,
    eventsHandler,
    { enabled: Boolean(gameId), onError: scheduleRefetch }
  )

  return {
    query,
    game,
    teams,
    events: events ?? [],
    draftedPlayerIds,
    captainTeam,
    currentTurnTeam,
    isAdmin,
    isCaptain: Boolean(captainTeam),
    isCaptainTurn,
    refetch,
  }
}
