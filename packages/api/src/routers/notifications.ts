import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { notifyConfirmationReminder, notifyCrunchTimeStarted, notifyGameNotification } from '../services/notifications'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '../supabase-admin'
import { ensureAdmin } from '../utils/ensureAdmin'
import { buildConfirmationWindowStart, buildJoinCutoff, buildZonedTime } from '../utils/time'

const registerInput = z.object({
  expoPushToken: z.string().min(1),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string().nullable().optional(),
})

const unregisterInput = z.object({
  expoPushToken: z.string().min(1),
})

const DEFAULT_CONFIRMATION_WINDOW_HOURS = 24
const REMINDER_GRACE_MINUTES = 5

type ReminderType = 'confirmation_reminder' | 'game_notification'

const communityInput = z.object({ communityId: z.string().uuid() })

export const notificationsRouter = createTRPCRouter({
  registerDevice: protectedProcedure.input(registerInput).mutation(async ({ ctx, input }) => {
    const { error } = await supabaseAdmin
      .from('user_devices')
      .upsert(
        {
          user_id: ctx.user.id,
          expo_push_token: input.expoPushToken,
          platform: input.platform,
          app_version: input.appVersion ?? null,
          last_seen_at: new Date().toISOString(),
          disabled_at: null,
        },
        { onConflict: 'expo_push_token' }
      )

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { ok: true }
  }),

  unregisterDevice: protectedProcedure.input(unregisterInput).mutation(async ({ ctx, input }) => {
    const { error } = await supabaseAdmin
      .from('user_devices')
      .update({ disabled_at: new Date().toISOString() })
      .eq('expo_push_token', input.expoPushToken)
      .eq('user_id', ctx.user.id)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { ok: true }
  }),

  sendCrunchTimeNotices: protectedProcedure.input(communityInput).mutation(async ({ ctx, input }) => {
      await ensureAdmin(ctx.supabase, ctx.user.id, input.communityId)
      const now = new Date()

      const { data, error } = await supabaseAdmin
        .from('games')
        .select(
          `
          id,
          start_time,
          capacity,
          confirmation_enabled,
          join_cutoff_offset_minutes_from_kickoff,
          crunch_time_start_time_local,
          crunch_time_notice_sent_at,
          communities!games_community_id_fkey (
            community_timezone,
            confirmation_window_hours_before_kickoff,
            crunch_time_enabled,
            crunch_time_start_time_local
          )
        `
        )
        .eq('status', 'scheduled')
        .eq('community_id', input.communityId)
        .not('start_time', 'is', null)
        .or('release_at.is.null,released_at.not.is.null')

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      const rows = (data ?? []) as Array<{
        id: string
        start_time: string | null
        capacity: number
        confirmation_enabled: boolean | null
        join_cutoff_offset_minutes_from_kickoff: number | null
        crunch_time_start_time_local: string | null
        crunch_time_notice_sent_at: string | null
        communities: {
          community_timezone: string | null
          confirmation_window_hours_before_kickoff: number | null
          crunch_time_enabled: boolean | null
          crunch_time_start_time_local: string | null
        } | null
      }>

      const candidates = rows.flatMap((game) => {
        if (!game.start_time || !game.communities) return []
        if (game.crunch_time_notice_sent_at) return []
        const confirmationEnabled = game.confirmation_enabled ?? true
        if (!confirmationEnabled) return []
        const crunchTimeEnabled = game.communities.crunch_time_enabled ?? true
        if (!crunchTimeEnabled) return []
        const joinCutoffOffset = game.join_cutoff_offset_minutes_from_kickoff ?? 0
        const confirmationWindowHours =
          game.communities.confirmation_window_hours_before_kickoff ?? DEFAULT_CONFIRMATION_WINDOW_HOURS
        const startTime = new Date(game.start_time)
        const joinCutoff = buildJoinCutoff(startTime, joinCutoffOffset)
        if (now >= joinCutoff) return []
        const confirmationWindowStart = buildConfirmationWindowStart(startTime, confirmationWindowHours)
        const confirmationWindowConfigured = joinCutoff > confirmationWindowStart
        if (!confirmationWindowConfigured) return []
        const timeZone = game.communities.community_timezone ?? 'UTC'
        const crunchTimeLocal =
          game.crunch_time_start_time_local ?? game.communities.crunch_time_start_time_local
        if (!crunchTimeLocal) return []
        const crunchStartCandidate = buildZonedTime({
          startTime,
          timeZone,
          timeLocal: crunchTimeLocal,
        })
        const crunchStart =
          crunchStartCandidate && crunchStartCandidate < joinCutoff ? crunchStartCandidate : null
        if (!crunchStart) return []
        if (now < crunchStart) return []
        return [
          {
            id: game.id,
            capacity: game.capacity ?? 0,
          },
        ]
      })

      if (!candidates.length) {
        return { checked: rows.length, candidates: 0, sentGames: 0, sentUsers: 0 }
      }

      const { data: queueRows, error: queueError } = await supabaseAdmin
        .from('game_queue')
        .select('game_id, profile_id, status, attendance_confirmed_at')
        .in(
          'game_id',
          candidates.map((candidate) => candidate.id)
        )

      if (queueError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: queueError.message })
      }

      const queueStats = new Map<
        string,
        { rosteredCount: number; unconfirmedCount: number; waitlistIds: string[] }
      >()

      for (const row of queueRows ?? []) {
        const gameId = row.game_id as string
        const stats = queueStats.get(gameId) ?? {
          rosteredCount: 0,
          unconfirmedCount: 0,
          waitlistIds: [],
        }
        if (row.status === 'rostered') {
          stats.rosteredCount += 1
          if (!row.attendance_confirmed_at) stats.unconfirmedCount += 1
        } else if (row.status === 'waitlisted') {
          if (row.profile_id) stats.waitlistIds.push(row.profile_id)
        }
        queueStats.set(gameId, stats)
      }

      let sentGames = 0
      let sentUsers = 0

      const pending = new Map<string, string[]>()

      for (const candidate of candidates) {
        const stats = queueStats.get(candidate.id)
        if (!stats) continue
        if (stats.rosteredCount < candidate.capacity) continue
        if (stats.unconfirmedCount <= 0) continue
        const waitlist = Array.from(new Set(stats.waitlistIds))
        if (!waitlist.length) continue
        pending.set(candidate.id, waitlist)
      }

      if (!pending.size) {
        return {
          checked: rows.length,
          candidates: candidates.length,
          sentGames: 0,
          sentUsers: 0,
        }
      }

      const { data: claimedRows, error: claimError } = await supabaseAdmin
        .from('games')
        .update({ crunch_time_notice_sent_at: now.toISOString() })
        .in('id', Array.from(pending.keys()))
        .is('crunch_time_notice_sent_at', null)
        .select('id')

      if (claimError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: claimError.message })
      }

      const claimed = new Set((claimedRows ?? []).map((row) => row.id as string))

      for (const [gameId, waitlist] of pending.entries()) {
        if (!claimed.has(gameId)) continue
        await notifyCrunchTimeStarted({
          supabaseAdmin,
          gameId,
          profileIds: waitlist,
        })
        sentGames += 1
        sentUsers += waitlist.length
      }

      return {
        checked: rows.length,
        candidates: candidates.length,
        sentGames,
        sentUsers,
      }
    }),

  sendReminderNotices: protectedProcedure.input(communityInput).mutation(async ({ ctx, input }) => {
      await ensureAdmin(ctx.supabase, ctx.user.id, input.communityId)
      const now = new Date()
      const graceStart = new Date(now.getTime() - REMINDER_GRACE_MINUTES * 60 * 1000)

      const { data, error } = await supabaseAdmin
        .from('games')
        .select(
          `
          id,
          start_time,
          confirmation_enabled,
          join_cutoff_offset_minutes_from_kickoff,
          communities!games_community_id_fkey (
            community_timezone,
            confirmation_window_hours_before_kickoff,
            confirmation_reminders_local_times,
            game_notification_times_local
          )
        `
        )
        .eq('status', 'scheduled')
        .eq('community_id', input.communityId)
        .not('start_time', 'is', null)
        .or('release_at.is.null,released_at.not.is.null')

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      const rows = (data ?? []) as Array<{
        id: string
        start_time: string | null
        confirmation_enabled: boolean | null
        join_cutoff_offset_minutes_from_kickoff: number | null
        communities: {
          community_timezone: string | null
          confirmation_window_hours_before_kickoff: number | null
          confirmation_reminders_local_times: string[] | null
          game_notification_times_local: string[] | null
        } | null
      }>

      const pendingLogs: Array<{ gameId: string; type: ReminderType; sendAt: Date }> = []
      const gameMeta = new Map<string, { confirmationEnabled: boolean }>()

      for (const game of rows) {
        if (!game.start_time || !game.communities) continue
        const confirmationEnabled = game.confirmation_enabled ?? true
        const startTime = new Date(game.start_time)
        const joinCutoff = buildJoinCutoff(startTime, game.join_cutoff_offset_minutes_from_kickoff ?? 0)
        if (now >= joinCutoff) continue
        const confirmationWindowHours =
          game.communities.confirmation_window_hours_before_kickoff ?? DEFAULT_CONFIRMATION_WINDOW_HOURS
        const confirmationWindowStart = buildConfirmationWindowStart(startTime, confirmationWindowHours)
        if (joinCutoff <= confirmationWindowStart) continue
        const timeZone = game.communities.community_timezone ?? 'UTC'

        const scheduleReminder = (timeLocal: string, type: ReminderType) => {
          const sendAt = buildZonedTime({ startTime: now, timeZone, timeLocal })
          if (!sendAt) return
          if (sendAt < graceStart || sendAt > now) return
          if (sendAt < confirmationWindowStart || sendAt >= joinCutoff) return
          pendingLogs.push({ gameId: game.id, type, sendAt })
        }

        if (confirmationEnabled) {
          const times = Array.from(new Set(game.communities.confirmation_reminders_local_times ?? []))
          times.forEach((timeLocal) => scheduleReminder(timeLocal, 'confirmation_reminder'))
        }

        const gameTimes = Array.from(new Set(game.communities.game_notification_times_local ?? []))
        gameTimes.forEach((timeLocal) => scheduleReminder(timeLocal, 'game_notification'))

        gameMeta.set(game.id, { confirmationEnabled })
      }

      if (!pendingLogs.length) {
        return { checked: rows.length, candidates: 0, sentGames: 0, sentNotifications: 0, sentUsers: 0 }
      }

      const { data: claimedRows, error: claimError } = await supabaseAdmin
        .from('game_notification_logs')
        .upsert(
          pendingLogs.map((log) => ({
            game_id: log.gameId,
            type: log.type,
            send_at: log.sendAt.toISOString(),
          })),
          { onConflict: 'game_id,type,send_at', ignoreDuplicates: true }
        )
        .select('game_id, type, send_at')

      if (claimError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: claimError.message })
      }

      const claimed = (claimedRows ?? []) as Array<{ game_id: string; type: ReminderType; send_at: string }>
      if (!claimed.length) {
        return {
          checked: rows.length,
          candidates: pendingLogs.length,
          sentGames: 0,
          sentNotifications: 0,
          sentUsers: 0,
        }
      }

      const claimedGameIds = Array.from(new Set(claimed.map((row) => row.game_id)))
      const { data: queueRows, error: queueError } = await supabaseAdmin
        .from('game_queue')
        .select('game_id, profile_id, status, attendance_confirmed_at')
        .in('game_id', claimedGameIds)

      if (queueError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: queueError.message })
      }

      const rosterByGame = new Map<string, { rosteredIds: string[]; unconfirmedIds: string[] }>()

      for (const row of queueRows ?? []) {
        if (row.status !== 'rostered' || !row.profile_id) continue
        const gameId = row.game_id as string
        const entry = rosterByGame.get(gameId) ?? { rosteredIds: [], unconfirmedIds: [] }
        entry.rosteredIds.push(row.profile_id)
        if (!row.attendance_confirmed_at) entry.unconfirmedIds.push(row.profile_id)
        rosterByGame.set(gameId, entry)
      }

      let sentNotifications = 0
      let sentUsers = 0
      const sentGameIds = new Set<string>()

      for (const row of claimed) {
        const roster = rosterByGame.get(row.game_id)
        if (!roster) continue
        const meta = gameMeta.get(row.game_id)
        if (row.type === 'confirmation_reminder') {
          if (!meta?.confirmationEnabled) continue
          const recipients = Array.from(new Set(roster.unconfirmedIds))
          if (!recipients.length) continue
          await notifyConfirmationReminder({ supabaseAdmin, gameId: row.game_id, profileIds: recipients })
          sentNotifications += 1
          sentUsers += recipients.length
          sentGameIds.add(row.game_id)
          continue
        }

        const recipients = Array.from(new Set(roster.rosteredIds))
        if (!recipients.length) continue
        await notifyGameNotification({ supabaseAdmin, gameId: row.game_id, profileIds: recipients })
        sentNotifications += 1
        sentUsers += recipients.length
        sentGameIds.add(row.game_id)
      }

      return {
        checked: rows.length,
        candidates: pendingLogs.length,
        sentGames: sentGameIds.size,
        sentNotifications,
        sentUsers,
      }
    }),
})
