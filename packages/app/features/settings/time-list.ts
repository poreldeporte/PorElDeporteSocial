const padTime = (value: number) => value.toString().padStart(2, '0')

export const formatTimeValue = (date: Date) =>
  `${padTime(date.getHours())}:${padTime(date.getMinutes())}`

export const parseTimeValue = (value: string) => {
  const [hourRaw, minuteRaw] = value.split(':')
  const hours = Number(hourRaw)
  const minutes = Number(minuteRaw)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return { hours, minutes }
}

export const buildDateFromTime = (value: string, baseDate = new Date()) => {
  const parts = parseTimeValue(value)
  const next = new Date(baseDate)
  if (!parts) return next
  next.setHours(parts.hours, parts.minutes, 0, 0)
  return next
}

export const parseTimeList = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

export const formatTimeList = (values: string[]) => values.join(', ')
