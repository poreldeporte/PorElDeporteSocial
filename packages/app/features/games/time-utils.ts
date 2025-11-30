export const timePattern = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i

export const formatTimeLabel = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

export const combineDateAndTime = (date: Date, time: string) => {
  const match = time.trim().match(timePattern)
  if (!match) return date

  let hours = Number(match[1])
  const minutes = Number(match[2])
  const period = match[3]?.toLowerCase()

  if (period === 'pm' && hours < 12) {
    hours += 12
  }
  if (period === 'am' && hours === 12) {
    hours = 0
  }

  const next = new Date(date)
  next.setHours(hours, minutes, 0, 0)
  return next
}

export const buildTimeOptions = () => {
  const options: { value: string; name: string }[] = []
  const base = new Date()

  for (let hour = 6; hour <= 23; hour++) {
    for (const minute of [0, 30]) {
      base.setHours(hour, minute, 0, 0)
      const label = formatTimeLabel(base)
      options.push({ value: label, name: label })
    }
  }

  return options
}

export const formatGameKickoffLabel = (date: Date | null) => {
  if (!date) return ''
  const day = date.toLocaleString(undefined, { weekday: 'long' })
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  })
  const parts = formatter.formatToParts(date)
  const hour = parts.find((part) => part.type === 'hour')?.value ?? ''
  const minute = parts.find((part) => part.type === 'minute')?.value ?? ''
  const dayPeriod = (parts.find((part) => part.type === 'dayPeriod')?.value ?? '').toLowerCase().replace(/\./g, '')
  const minuteLabel = minute === '00' ? '' : `:${minute}`
  const time = `${hour}${minuteLabel}${dayPeriod}`.replace(/\s+/g, '')
  return `${day} ${time}`.trim()
}
