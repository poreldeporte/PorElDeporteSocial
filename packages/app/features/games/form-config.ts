import { z } from 'zod'

import { formFields } from 'app/utils/SchemaForm'

import { buildTimeOptions, combineDateAndTime, formatGameKickoffLabel, formatTimeLabel } from './time-utils'

export const GameFormBase = z.object({
  start_time: formFields.date.describe('Start Date // When play begins'),
  start_time_time: formFields.select.describe('Start Time // e.g. 7:00 PM'),
  recurring_enabled: formFields.boolean_switch.describe('Recurring weekly'),
  release_date: formFields.date.describe('Release Date'),
  release_time: formFields.select.describe('Release Time'),
  audience_is_community: formFields.boolean_switch.describe('Entire community'),
  audience_group_id: formFields.selectOptional.describe('Audience group'),
  capacity: formFields.number.min(2).max(50).describe('Capacity // Number of spots'),
  location_name: formFields.text.describe('Location // Brickell Soccer & Padel'),
  confirmation_enabled: formFields.boolean_switch.describe('Confirmation required'),
  join_cutoff_offset_minutes_from_kickoff: formFields.number
    .min(0)
    .describe('Join cutoff (minutes before kickoff)'),
  draft_mode_enabled: formFields.boolean_switch.describe('Draft mode enabled'),
  draft_visibility: formFields.select.describe('Draft visibility'),
  draft_chat_enabled: formFields.boolean_switch.describe('Draft chat enabled'),
})

export type GameFormValues = z.infer<typeof GameFormBase>

const validateReleaseBeforeKickoff = (values: GameFormValues, ctx: z.RefinementCtx) => {
  if (!values.recurring_enabled) return
  const kickoffDate = values.start_time.dateValue ?? new Date()
  const releaseDate = values.release_date.dateValue ?? kickoffDate
  const kickoffAt = combineDateAndTime(kickoffDate, values.start_time_time)
  const releaseAt = combineDateAndTime(releaseDate, values.release_time)
  if (releaseAt > kickoffAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Release time must be before kickoff.',
      path: ['release_time'],
    })
  }
}

const validateAudienceSelection = (values: GameFormValues, ctx: z.RefinementCtx) => {
  if (values.audience_is_community) return
  const selected = typeof values.audience_group_id === 'string' ? values.audience_group_id.trim() : ''
  if (!selected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select a group for this game.',
      path: ['audience_group_id'],
    })
  }
}

const validateGameForm = (values: GameFormValues, ctx: z.RefinementCtx) => {
  validateReleaseBeforeKickoff(values, ctx)
  validateAudienceSelection(values, ctx)
}

export const GameFormSchema = GameFormBase.superRefine(validateGameForm)

export const extendGameFormSchema = (shape: z.ZodRawShape) =>
  GameFormBase.extend(shape).superRefine(validateGameForm)

export const defaultGameStart = () => {
  const start = new Date()
  start.setHours(19, 0, 0, 0)
  return start
}

type FormDefaultsInput = {
  startTime?: string | null
  releaseAt?: string | null
  releasedAt?: string | null
  audienceGroupId?: string | null
  locationName?: string | null
  capacity?: number | null
  confirmationEnabled?: boolean | null
  joinCutoffOffsetMinutesFromKickoff?: number | null
  draftModeEnabled?: boolean | null
  draftVisibility?: GameFormValues['draft_visibility'] | null
  draftChatEnabled?: boolean | null
}

export const buildGameFormDefaults = (game?: FormDefaultsInput) => {
  const startDate = game?.startTime ? new Date(game.startTime) : defaultGameStart()
  const releaseDate = game?.releaseAt ? new Date(game.releaseAt) : startDate
  return {
    start_time: { dateValue: startDate },
    start_time_time: formatTimeLabel(startDate),
    recurring_enabled: Boolean(game?.releaseAt),
    release_date: { dateValue: releaseDate },
    release_time: formatTimeLabel(releaseDate),
    audience_is_community: !game?.audienceGroupId,
    audience_group_id: game?.audienceGroupId ?? undefined,
    capacity: game?.capacity ?? 12,
    location_name: game?.locationName ?? 'Brickell Soccer & Padel',
    confirmation_enabled: game?.confirmationEnabled ?? true,
    join_cutoff_offset_minutes_from_kickoff: game?.joinCutoffOffsetMinutesFromKickoff ?? 0,
    draft_mode_enabled: game?.draftModeEnabled ?? true,
    draft_visibility: game?.draftVisibility ?? 'public',
    draft_chat_enabled: game?.draftChatEnabled ?? true,
  }
}

export const buildGameFormProps = () => ({
  start_time_time: {
    options: buildTimeOptions(),
    placeholder: 'Select start time',
  },
  release_time: {
    options: buildTimeOptions(),
    placeholder: 'Select release time',
  },
  draft_visibility: {
    options: [
      { name: 'Public', value: 'public' },
      { name: 'Admin only', value: 'admin_only' },
    ],
  },
  audience_group_id: {
    options: [],
    placeholder: 'Select group',
  },
})

export const serializeGameFormValues = (values: GameFormValues) => {
  const startDate = values.start_time.dateValue ?? new Date()
  const kickoff = combineDateAndTime(startDate, values.start_time_time)
  const releaseDate = values.release_date.dateValue ?? startDate
  const releaseAt = combineDateAndTime(releaseDate, values.release_time)
  const derivedName = formatGameKickoffLabel(kickoff) || 'Pickup Game'
  const audienceGroupId = values.audience_is_community
    ? null
    : (values.audience_group_id ?? '').trim() || null
  return {
    name: derivedName,
    startTime: kickoff.toISOString(),
    releaseAt: values.recurring_enabled ? releaseAt.toISOString() : null,
    audienceGroupId,
    locationName: values.location_name ?? 'Brickell Soccer & Padel',
    locationNotes: null,
    cost: 0,
    capacity: values.capacity,
    confirmationEnabled: values.confirmation_enabled,
    joinCutoffOffsetMinutesFromKickoff: values.join_cutoff_offset_minutes_from_kickoff,
    draftModeEnabled: values.draft_mode_enabled,
    draftVisibility: values.draft_visibility,
    draftChatEnabled: values.draft_mode_enabled ? values.draft_chat_enabled : false,
  }
}
