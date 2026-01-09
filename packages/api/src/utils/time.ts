const parseTimeParts = (time: string) => {
  const segments = time.trim().split(':')
  if (segments.length < 2) return null
  const hours = Number(segments[0])
  const minutes = Number(segments[1])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return { hours, minutes }
}

const buildDateParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const values = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value
    return acc
  }, {})
  const year = Number(values.year)
  const month = Number(values.month)
  const day = Number(values.day)
  if (!year || !month || !day) return null
  return { year, month, day }
}

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const values = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value
    return acc
  }, {})
  const utcGuess = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  )
  return utcGuess - date.getTime()
}

export const buildJoinCutoff = (startTime: Date, offsetMinutes: number) =>
  new Date(startTime.getTime() - offsetMinutes * 60 * 1000)

export const buildConfirmationWindowStart = (startTime: Date, windowHours: number) =>
  new Date(startTime.getTime() - windowHours * 60 * 60 * 1000)

export const buildZonedTime = ({
  startTime,
  timeZone,
  timeLocal,
}: {
  startTime: Date
  timeZone: string
  timeLocal: string
}) => {
  const dateParts = buildDateParts(startTime, timeZone)
  const timeParts = parseTimeParts(timeLocal)
  if (!dateParts || !timeParts) return null

  const utcGuess = new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, timeParts.hours, timeParts.minutes, 0)
  )
  const offsetMs = getTimeZoneOffsetMs(utcGuess, timeZone)
  return new Date(utcGuess.getTime() - offsetMs)
}
