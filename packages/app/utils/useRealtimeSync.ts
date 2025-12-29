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

  const schedule = useCallback(() => {
    if (shouldFlushNow()) {
      callback()
      return
    }
    if (timerRef.current) return
    timerRef.current = setTimeout(() => {
      callback()
      timerRef.current = null
    }, delay)
  }, [callback, delay])

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
    callback()
  })

  return schedule
}

const LIST_SCOPES: Array<{ scope: 'upcoming' | 'past' }> = [
  { scope: 'upcoming' },
  { scope: 'past' },
]

const invalidateAllGameLists = (utils: ReturnType<typeof api.useUtils>) => {
  LIST_SCOPES.forEach((input) => {
    void utils.games.list.invalidate(input)
  })
}


const patchGameListItem = (
  utils: ReturnType<typeof api.useUtils>,
  gameId: string,
  updater: (game: GameListItem) => GameListItem
) => {
  LIST_SCOPES.forEach((input) => {
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
  let confirmed = 0
  let waitlisted = 0
  queue.forEach((entry) => {
    if (entry.status === 'confirmed') confirmed += 1
    if (entry.status === 'waitlisted') waitlisted += 1
  })
  return { confirmedCount: confirmed, waitlistedCount: waitlisted }
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
      confirmedCount: counts.confirmedCount,
      waitlistedCount: counts.waitlistedCount,
    }
  })
}


const mergeQueueEntryFields = (entry: GameDetail['queue'][number], row: Partial<QueueTableRow>) => ({
  ...entry,
  status: (row.status as GameDetail['queue'][number]['status']) ?? entry.status,
  joinedAt: row.joined_at ?? entry.joinedAt,
  promotedAt: row.promoted_at ?? entry.promotedAt,
  cancelledAt: row.cancelled_at ?? entry.cancelledAt,
  attendanceConfirmedAt: row.attendance_confirmed_at ?? entry.attendanceConfirmedAt,
})

const getQueueDelta = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: { status?: Database['public']['Enums']['game_queue_status'] | null }
  old: { status?: Database['public']['Enums']['game_queue_status'] | null }
}) => {
  let deltaConfirmed = 0
  let deltaWaitlisted = 0
  const oldStatus = payload.old?.status ?? null
  const newStatus = payload.new?.status ?? null

  if (payload.eventType === 'INSERT') {
    if (newStatus === 'confirmed') deltaConfirmed += 1
    if (newStatus === 'waitlisted') deltaWaitlisted += 1
  } else if (payload.eventType === 'DELETE') {
    if (oldStatus === 'confirmed') deltaConfirmed -= 1
    if (oldStatus === 'waitlisted') deltaWaitlisted -= 1
  } else if (payload.eventType === 'UPDATE') {
    if (oldStatus === newStatus) return { deltaConfirmed, deltaWaitlisted }
    if (oldStatus === 'confirmed') deltaConfirmed -= 1
    if (oldStatus === 'waitlisted') deltaWaitlisted -= 1
    if (newStatus === 'confirmed') deltaConfirmed += 1
    if (newStatus === 'waitlisted') deltaWaitlisted += 1
  }
  return { deltaConfirmed, deltaWaitlisted }
}

export const useGameRealtimeSync = (gameId?: string | null) => {
  const utils = api.useUtils()
  const scheduleDetailInvalidate = useThrottledInvalidate(() => {
    if (!gameId) return
    void utils.games.byId.invalidate({ id: gameId })
  }, 120)

  const detailChannelHandler = useCallback(
    (channel: RealtimeChannel) => {
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const next = payload.new as Database['public']['Tables']['games']['Row'] | null
          if (!next) return
          const id = next.id
          patchGameListItem(utils, id, (game) => ({
            ...game,
            status: next.status,
            draftStatus: next.draft_status,
            startTime: next.start_time,
          }))
          patchGameDetail(utils, id, (detail) => ({
            ...detail,
            status: next.status,
            draftStatus: next.draft_status,
            startTime: next.start_time ?? detail.startTime,
            endTime: next.end_time ?? detail.endTime,
            description: next.description ?? detail.description,
          }))
        }
      )
    },
    [gameId, utils]
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
          if (deltas.deltaConfirmed !== 0 || deltas.deltaWaitlisted !== 0) {
            patchGameListItem(utils, gameIdFromRow, (game) => ({
              ...game,
              confirmedCount: Math.max(0, game.confirmedCount + deltas.deltaConfirmed),
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

  useRealtimeChannel(channelName ? `${channelName}:detail` : null, detailChannelHandler, {
    enabled: Boolean(gameId),
    onError: scheduleDetailInvalidate,
  })

  useRealtimeChannel(channelName ? `${channelName}:queue` : null, queueChannelHandler, {
    enabled: Boolean(gameId),
    onError: scheduleDetailInvalidate,
  })
}

export const useGamesListRealtime = (enabled: boolean) => {
  const utils = api.useUtils()
  const scheduleInvalidate = useThrottledInvalidate(() => {
    invalidateAllGameLists(utils)
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
            patchGameListItem(utils, next.id, (game) => ({
              ...game,
              status: next.status,
              draftStatus: next.draft_status,
              startTime: next.start_time,
              endTime: next.end_time,
            }))
          }
        )
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'games' }, scheduleInvalidate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_queue' }, (payload) => {
          const row = payload.new as { game_id?: string | null; status?: Database['public']['Enums']['game_queue_status'] | null }
          const gameId = row?.game_id ?? (payload.old as { game_id?: string | null } | null)?.game_id
          if (!gameId) return
          const deltas = getQueueDelta({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as { status?: Database['public']['Enums']['game_queue_status'] | null },
            old: payload.old as { status?: Database['public']['Enums']['game_queue_status'] | null },
          })
          if (deltas.deltaConfirmed !== 0 || deltas.deltaWaitlisted !== 0) {
            patchGameListItem(utils, gameId, (game) => ({
              ...game,
              confirmedCount: Math.max(0, game.confirmedCount + deltas.deltaConfirmed),
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
    [utils, scheduleInvalidate]
  )

  useRealtimeChannel('games:list', listChannelHandler, {
    enabled,
    onError: scheduleInvalidate,
  })
}

export const useStatsRealtime = (enabled: boolean) => {
  const utils = api.useUtils()
  const scheduleInvalidate = useThrottledInvalidate(() => {
    void utils.stats.myStats.invalidate()
  }, 200)

  const statsChannelHandler = useCallback(
    (channel: RealtimeChannel) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_results' },
        scheduleInvalidate
      )
    },
    [scheduleInvalidate]
  )

  useRealtimeChannel('games:results', statsChannelHandler, {
    enabled,
    onError: scheduleInvalidate,
  })
}
