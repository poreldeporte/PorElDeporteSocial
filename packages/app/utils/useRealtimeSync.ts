import { useCallback, useEffect, useRef } from 'react'

import type { RouterOutputs } from './api'
import { api } from './api'
import type { Database } from '@my/supabase/types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { REALTIME_INVALIDATE_DELAY_MS } from 'app/constants/realtime'
import { useRealtimeChannel } from './useRealtimeChannel'

type GameListItem = RouterOutputs['games']['list'][number]
type GameDetail = RouterOutputs['games']['byId']
type QueueTableRow = Database['public']['Tables']['game_queue']['Row']

const shouldFlushNow = () => {
  if (typeof document === 'undefined') return false
  return document.hidden
}

const useFocusInvalidate = (callback: () => void) => {
  const cbRef = useRef(callback)
  cbRef.current = callback
  useEffect(() => {
    if (typeof document === 'undefined') return
    const handler = () => {
      if (document.hidden) return
      cbRef.current()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])
}

const useThrottledInvalidate = (callback: () => void, delay = REALTIME_INVALIDATE_DELAY_MS) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const schedule = useCallback(() => {
    if (shouldFlushNow()) {
      callbackRef.current()
      return
    }
    if (timerRef.current) return
    timerRef.current = setTimeout(() => {
      callbackRef.current()
      timerRef.current = null
    }, delay)
  }, [delay])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  useFocusInvalidate(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    callbackRef.current()
  })

  return schedule
}

const LIST_SCOPES: Array<'upcoming' | 'past'> = ['upcoming', 'past']

const buildListInputs = (communityId: string) =>
  LIST_SCOPES.map((scope) => ({ scope, communityId }))

const invalidateAllGameLists = (
  utils: ReturnType<typeof api.useUtils>,
  communityId?: string | null
) => {
  if (!communityId) return
  buildListInputs(communityId).forEach((input) => {
    void utils.games.list.invalidate(input)
  })
}


const patchGameListItem = (
  utils: ReturnType<typeof api.useUtils>,
  communityId: string | null | undefined,
  gameId: string,
  updater: (game: GameListItem) => GameListItem
) => {
  if (!communityId) return
  buildListInputs(communityId).forEach((input) => {
    utils.games.list.setData(input, (current) => {
      if (!current) return current
      let changed = false
      const next = current.map((game) => {
        if (game.id !== gameId) return game
        const updated = updater(game)
        if (updated !== game) changed = true
        return updated
      })
      return changed ? next : current
    })
  })
}

const patchGameDetail = (
  utils: ReturnType<typeof api.useUtils>,
  gameId: string,
  updater: (detail: GameDetail) => GameDetail
) => {
  utils.games.byId.setData({ id: gameId }, (current) => {
    if (!current) return current
    const updated = updater(current)
    return updated
  })
}

const recalcCounts = (queue: GameDetail['queue']) => {
  let rostered = 0
  let waitlisted = 0
  queue.forEach((entry) => {
    if (entry.status === 'rostered') rostered += 1
    if (entry.status === 'waitlisted') waitlisted += 1
  })
  return { rosteredCount: rostered, waitlistedCount: waitlisted }
}

const updateQueue = (
  utils: ReturnType<typeof api.useUtils>,
  gameId: string,
  mutate: (queue: GameDetail['queue']) => GameDetail['queue']
) => {
  patchGameDetail(utils, gameId, (detail) => {
    const nextQueue = mutate(detail.queue)
    if (nextQueue === detail.queue) return detail
    const counts = recalcCounts(nextQueue)
    return {
      ...detail,
      queue: nextQueue,
      rosteredCount: counts.rosteredCount,
      waitlistedCount: counts.waitlistedCount,
    }
  })
}


const mergeQueueEntryFields = (entry: GameDetail['queue'][number], row: Partial<QueueTableRow>) => ({
  ...entry,
  status: (row.status as GameDetail['queue'][number]['status']) ?? entry.status,
  joinedAt: row.joined_at ?? entry.joinedAt,
  promotedAt: row.promoted_at ?? entry.promotedAt,
  droppedAt: row.dropped_at ?? entry.droppedAt,
  attendanceConfirmedAt: row.attendance_confirmed_at ?? entry.attendanceConfirmedAt,
  noShowAt: row.no_show_at ?? entry.noShowAt,
  noShowBy: row.no_show_by ?? entry.noShowBy,
  tardyAt: row.tardy_at ?? entry.tardyAt,
  tardyBy: row.tardy_by ?? entry.tardyBy,
})

const getQueueDelta = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: { status?: Database['public']['Enums']['game_queue_status'] | null }
  old: { status?: Database['public']['Enums']['game_queue_status'] | null }
}) => {
  let deltaRostered = 0
  let deltaWaitlisted = 0
  const oldStatus = payload.old?.status ?? null
  const newStatus = payload.new?.status ?? null

  if (payload.eventType === 'INSERT') {
    if (newStatus === 'rostered') deltaRostered += 1
    if (newStatus === 'waitlisted') deltaWaitlisted += 1
  } else if (payload.eventType === 'DELETE') {
    if (oldStatus === 'rostered') deltaRostered -= 1
    if (oldStatus === 'waitlisted') deltaWaitlisted -= 1
  } else if (payload.eventType === 'UPDATE') {
    if (oldStatus === newStatus) return { deltaRostered, deltaWaitlisted }
    if (oldStatus === 'rostered') deltaRostered -= 1
    if (oldStatus === 'waitlisted') deltaWaitlisted -= 1
    if (newStatus === 'rostered') deltaRostered += 1
    if (newStatus === 'waitlisted') deltaWaitlisted += 1
  }
  return { deltaRostered, deltaWaitlisted }
}

export const useGameRealtimeSync = (gameId?: string | null, enabled = true) => {
  const utils = api.useUtils()
  const scheduleDetailInvalidate = useThrottledInvalidate(() => {
    if (!gameId) return
    void utils.games.byId.invalidate({ id: gameId })
  }, 120)
  const scheduleVoteInvalidate = useThrottledInvalidate(() => {
    if (!gameId) return
    void utils.games.captainVotes.invalidate({ gameId })
  }, 120)

  const detailChannelHandler = useCallback(
    (channel: RealtimeChannel) => {
      channel
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
          (payload) => {
            const next = payload.new as Database['public']['Tables']['games']['Row'] | null
            if (!next) return
            const id = next.id
            patchGameListItem(utils, next.community_id, id, (game) => ({
              ...game,
              name: next.name,
              description: next.description,
              startTime: next.start_time,
              endTime: next.end_time,
              releaseAt: next.release_at,
              releasedAt: next.released_at,
              audienceGroupId: next.audience_group_id,
              locationName: next.location_name,
              locationNotes: next.location_notes,
              status: next.status,
              draftStatus: next.draft_status,
              costCents: next.cost_cents,
              capacity: next.capacity,
              cancelledAt: next.cancelled_at,
              communityId: next.community_id,
              confirmationEnabled: next.confirmation_enabled,
              joinCutoffOffsetMinutesFromKickoff: next.join_cutoff_offset_minutes_from_kickoff,
              draftModeEnabled: next.draft_mode_enabled,
              draftStyle: next.draft_style,
              draftVisibility: next.draft_visibility,
              draftChatEnabled: next.draft_chat_enabled,
              crunchTimeStartTimeLocal: next.crunch_time_start_time_local,
            }))
            patchGameDetail(utils, id, (detail) => ({
              ...detail,
              name: next.name,
              description: next.description,
              startTime: next.start_time,
              endTime: next.end_time,
              releaseAt: next.release_at,
              releasedAt: next.released_at,
              audienceGroupId: next.audience_group_id,
              locationName: next.location_name,
              locationNotes: next.location_notes,
              status: next.status,
              draftStatus: next.draft_status,
              costCents: next.cost_cents,
              capacity: next.capacity,
              cancelledAt: next.cancelled_at,
              communityId: next.community_id,
              confirmationEnabled: next.confirmation_enabled,
              joinCutoffOffsetMinutesFromKickoff: next.join_cutoff_offset_minutes_from_kickoff,
              draftModeEnabled: next.draft_mode_enabled,
              draftStyle: next.draft_style,
              draftVisibility: next.draft_visibility,
              draftChatEnabled: next.draft_chat_enabled,
              crunchTimeStartTimeLocal: next.crunch_time_start_time_local,
            }))
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_results', filter: `game_id=eq.${gameId}` },
          scheduleDetailInvalidate
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_teams', filter: `game_id=eq.${gameId}` },
          scheduleDetailInvalidate
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_team_members', filter: `game_id=eq.${gameId}` },
          scheduleDetailInvalidate
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_captains', filter: `game_id=eq.${gameId}` },
          scheduleDetailInvalidate
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_captain_votes', filter: `game_id=eq.${gameId}` },
          scheduleVoteInvalidate
        )
    },
    [gameId, utils, scheduleDetailInvalidate, scheduleVoteInvalidate]
  )

  const queueChannelHandler = useCallback(
    (channel: RealtimeChannel) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_queue', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const newRow = payload.new as QueueTableRow | null
          const oldRow = payload.old as QueueTableRow | null
          const gameIdFromRow = newRow?.game_id ?? oldRow?.game_id
          if (!gameIdFromRow) return

          const deltas = getQueueDelta({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: (payload.new as { status?: Database['public']['Enums']['game_queue_status'] | null }) ?? {},
            old: (payload.old as { status?: Database['public']['Enums']['game_queue_status'] | null }) ?? {},
          })
          const detail = utils.games.byId.getData({ id: gameIdFromRow })
          const communityId = detail?.communityId ?? null
          if (deltas.deltaRostered !== 0 || deltas.deltaWaitlisted !== 0) {
            patchGameListItem(utils, communityId, gameIdFromRow, (game) => ({
              ...game,
              rosteredCount: Math.max(0, game.rosteredCount + deltas.deltaRostered),
              waitlistedCount: Math.max(0, game.waitlistedCount + deltas.deltaWaitlisted),
            }))
          }

          const queueId = newRow?.id ?? oldRow?.id
          if (!queueId) return
          let applied = false
          updateQueue(utils, gameIdFromRow, (queue) => {
            const index = queue.findIndex((entry) => entry.id === queueId)
            if (payload.eventType === 'DELETE') {
              if (index === -1) return queue
              applied = true
              const next = [...queue]
              next.splice(index, 1)
              return next
            }
            if (index === -1 || !newRow) return queue
            applied = true
            const next = [...queue]
            next[index] = mergeQueueEntryFields(next[index], newRow)
            return next
          })
          if (!applied) {
            scheduleDetailInvalidate()
          }
        }
      )
    },
    [gameId, utils, scheduleDetailInvalidate]
  )

  const channelName = gameId ? `games:${gameId}` : null

  const realtimeEnabled = Boolean(gameId && enabled)

  useRealtimeChannel(channelName ? `${channelName}:detail` : null, detailChannelHandler, {
    enabled: realtimeEnabled,
    onError: scheduleDetailInvalidate,
  })

  useRealtimeChannel(channelName ? `${channelName}:queue` : null, queueChannelHandler, {
    enabled: realtimeEnabled,
    onError: scheduleDetailInvalidate,
  })
}

export const useGamesListRealtime = (enabled: boolean, communityId?: string | null) => {
  const utils = api.useUtils()
  const scheduleInvalidate = useThrottledInvalidate(() => {
    invalidateAllGameLists(utils, communityId)
  }, 150)

  const listChannelHandler = useCallback(
    (channel: RealtimeChannel) => {
      channel
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'games' },
          (payload) => {
            const next = payload.new as Database['public']['Tables']['games']['Row'] | null
            if (!next) return
            const previous = payload.old as Database['public']['Tables']['games']['Row'] | null
            const releaseChanged =
              Boolean(previous) &&
              (previous.release_at !== next.release_at ||
                previous.released_at !== next.released_at)
            if (communityId && next.community_id !== communityId) return
            patchGameListItem(utils, communityId, next.id, (game) => ({
              ...game,
              name: next.name,
              description: next.description,
              status: next.status,
              draftStatus: next.draft_status,
              startTime: next.start_time,
              endTime: next.end_time,
              releaseAt: next.release_at,
              releasedAt: next.released_at,
              audienceGroupId: next.audience_group_id,
              locationName: next.location_name,
              locationNotes: next.location_notes,
              costCents: next.cost_cents,
              capacity: next.capacity,
              cancelledAt: next.cancelled_at,
              communityId: next.community_id,
              confirmationEnabled: next.confirmation_enabled,
              joinCutoffOffsetMinutesFromKickoff: next.join_cutoff_offset_minutes_from_kickoff,
              draftModeEnabled: next.draft_mode_enabled,
              draftStyle: next.draft_style,
              draftVisibility: next.draft_visibility,
              draftChatEnabled: next.draft_chat_enabled,
              crunchTimeStartTimeLocal: next.crunch_time_start_time_local,
            }))
            if (previous && previous.start_time !== next.start_time) {
              scheduleInvalidate()
            }
            if (releaseChanged) {
              scheduleInvalidate()
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'games' },
          (payload) => {
            const row = payload.new as Database['public']['Tables']['games']['Row'] | null
            if (communityId && row?.community_id !== communityId) return
            scheduleInvalidate()
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'games' },
          scheduleInvalidate
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_captains' }, scheduleInvalidate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_queue' }, (payload) => {
          const row = payload.new as { game_id?: string | null; status?: Database['public']['Enums']['game_queue_status'] | null }
          const gameId = row?.game_id ?? (payload.old as { game_id?: string | null } | null)?.game_id
          if (!gameId) return
          const deltas = getQueueDelta({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as { status?: Database['public']['Enums']['game_queue_status'] | null },
            old: payload.old as { status?: Database['public']['Enums']['game_queue_status'] | null },
          })
          const detail = utils.games.byId.getData({ id: gameId })
          const listCommunityId = detail?.communityId ?? communityId ?? null
          if (deltas.deltaRostered !== 0 || deltas.deltaWaitlisted !== 0) {
            patchGameListItem(utils, listCommunityId, gameId, (game) => ({
              ...game,
              rosteredCount: Math.max(0, game.rosteredCount + deltas.deltaRostered),
              waitlistedCount: Math.max(0, game.waitlistedCount + deltas.deltaWaitlisted),
            }))
          }
          scheduleInvalidate()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_draft_events' }, () => {
          scheduleInvalidate()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_results' }, () => {
          scheduleInvalidate()
        })
    },
    [utils, scheduleInvalidate, communityId]
  )

  useRealtimeChannel('games:list', listChannelHandler, {
    enabled,
    onError: scheduleInvalidate,
  })
}

export const useStatsRealtime = (enabled: boolean, communityId?: string | null) => {
  const utils = api.useUtils()
  const scheduleInvalidate = useThrottledInvalidate(() => {
    if (!communityId) return
    void utils.stats.myStats.invalidate({ communityId })
    void utils.stats.leaderboard.invalidate({ communityId })
    void utils.stats.myCommunityRating.invalidate({ communityId })
  }, 200)
  const communityFilter = communityId ? `community_id=eq.${communityId}` : undefined

  const statsChannelHandler = useCallback(
    (channel: RealtimeChannel) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_results' },
        scheduleInvalidate
      ).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_queue' },
        scheduleInvalidate
      ).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_ratings', ...(communityFilter ? { filter: communityFilter } : {}) },
        scheduleInvalidate
      )
    },
    [communityFilter, scheduleInvalidate]
  )

  useRealtimeChannel('games:results', statsChannelHandler, {
    enabled,
    onError: scheduleInvalidate,
  })
}

export const useGameReviewsRealtime = (enabled: boolean, gameId?: string | null) => {
  const utils = api.useUtils()
  const scheduleInvalidate = useThrottledInvalidate(() => {
    if (!gameId) return
    void utils.reviews.listByGame.invalidate({ gameId })
  }, 200)

  const reviewsChannelHandler = useCallback(
    (channel: RealtimeChannel) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_reviews', filter: `game_id=eq.${gameId}` },
        scheduleInvalidate
      )
    },
    [gameId, scheduleInvalidate]
  )

  useRealtimeChannel(gameId ? `game:${gameId}:reviews` : null, reviewsChannelHandler, {
    enabled: Boolean(gameId && enabled),
    onError: scheduleInvalidate,
  })
}
