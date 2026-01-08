import { z } from 'zod'

import { formFields } from 'app/utils/SchemaForm'

import { buildTimeOptions, combineDateAndTime, formatGameKickoffLabel, formatTimeLabel } from './time-utils'

export const GameFormSchema = z.object({
  start_time: formFields.date.describe('Start Date // When play begins'),
  start_time_time: formFields.select.describe('Start Time // e.g. 7:00 PM'),
  capacity: formFields.number.min(2).max(50).describe('Capacity // Number of spots'),
  location_name: formFields.text.describe('Location // Brickell Soccer & Padel'),
  confirmation_enabled: formFields.boolean_switch.describe('Confirmation required'),
  join_cutoff_offset_minutes_from_kickoff: formFields.number
    .min(0)
    .describe('Join cutoff (minutes before kickoff)'),
  draft_mode_enabled: formFields.boolean_switch.describe('Draft mode enabled'),
})

export type GameFormValues = z.infer<typeof GameFormSchema>

export const defaultGameStart = () => {
  const start = new Date()
  start.setHours(19, 0, 0, 0)
  return start
}

type FormDefaultsInput = {
  startTime?: string | null
  locationName?: string | null
  capacity?: number | null
  confirmationEnabled?: boolean | null
  joinCutoffOffsetMinutesFromKickoff?: number | null
  draftModeEnabled?: boolean | null
}

export const buildGameFormDefaults = (game?: FormDefaultsInput) => {
  const startDate = game?.startTime ? new Date(game.startTime) : defaultGameStart()
  return {
    start_time: { dateValue: startDate },
    start_time_time: formatTimeLabel(startDate),
    capacity: game?.capacity ?? 12,
    location_name: game?.locationName ?? 'Brickell Soccer & Padel',
    confirmation_enabled: game?.confirmationEnabled ?? true,
    join_cutoff_offset_minutes_from_kickoff: game?.joinCutoffOffsetMinutesFromKickoff ?? 0,
    draft_mode_enabled: game?.draftModeEnabled ?? true,
  }
}

export const buildGameFormProps = () => ({
  start_time_time: {
    options: buildTimeOptions(),
    placeholder: 'Select start time',
  },
})

export const serializeGameFormValues = (values: GameFormValues) => {
  const startDate = values.start_time.dateValue ?? new Date()
  const kickoff = combineDateAndTime(startDate, values.start_time_time)
  const derivedName = formatGameKickoffLabel(kickoff) || 'Pickup Game'
  return {
    name: derivedName,
    startTime: kickoff.toISOString(),
    locationName: values.location_name ?? 'Brickell Soccer & Padel',
    locationNotes: null,
    cost: 0,
    capacity: values.capacity,
    confirmationEnabled: values.confirmation_enabled,
    joinCutoffOffsetMinutesFromKickoff: values.join_cutoff_offset_minutes_from_kickoff,
    draftModeEnabled: values.draft_mode_enabled,
  }
}
