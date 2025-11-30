import { formFields } from 'app/utils/SchemaForm'
import { z } from 'zod'

import { DEFAULT_WAITLIST_LIMIT } from '@my/config/game'
import { buildTimeOptions, combineDateAndTime, formatGameKickoffLabel, formatTimeLabel } from './time-utils'

export const GameFormSchema = z.object({
  description: formFields.textarea.describe('Description // Optional details').optional(),
  start_time: formFields.date.describe('Start Date // When play begins'),
  start_time_time: formFields.select.describe('Start Time // e.g. 7:00 PM'),
  location_name: formFields.text.describe('Location // Brickell Soccer Rooftop').optional(),
  location_notes: formFields.text.describe('Location Notes // Gate code, parking, etc.').optional(),
  cost: formFields.number.min(0).describe('Cost (USD) // 25'),
  capacity: formFields.number.min(2).max(50).describe('Capacity // Number of spots'),
})

export type GameFormValues = z.infer<typeof GameFormSchema>

export const defaultGameStart = () => {
  const start = new Date()
  start.setHours(start.getHours() + 2, 0, 0, 0)
  return start
}

type FormDefaultsInput = {
  description?: string | null
  startTime?: string | null
  locationName?: string | null
  locationNotes?: string | null
  costCents?: number | null
  capacity?: number | null
}

export const buildGameFormDefaults = (game?: FormDefaultsInput) => {
  const startDate = game?.startTime ? new Date(game.startTime) : defaultGameStart()
  return {
    description: game?.description ?? '',
    start_time: { dateValue: startDate },
    start_time_time: formatTimeLabel(startDate),
    location_name: game?.locationName ?? '',
    location_notes: game?.locationNotes ?? '',
    cost: game?.costCents ? game.costCents / 100 : 25,
    capacity: game?.capacity ?? 12,
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
    description: values.description ?? null,
    startTime: kickoff.toISOString(),
    locationName: values.location_name ?? null,
    locationNotes: values.location_notes ?? null,
    cost: values.cost,
    capacity: values.capacity,
  }
}
