import { z } from 'zod'

export type BirthDateParts = {
  month: string
  day: string
  year: string
}

const EMPTY_BIRTH_DATE: BirthDateParts = {
  month: '',
  day: '',
  year: '',
}

const toNumber = (value: string) => Number.parseInt(value, 10)

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate()
const toMidnight = (date: Date) => {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export const emptyBirthDateParts = () => ({ ...EMPTY_BIRTH_DATE })

export const normalizeBirthDatePart = (value: string, maxLength: number) =>
  value.replace(/\D/g, '').slice(0, maxLength)

export const isValidBirthDateParts = (parts: BirthDateParts) => {
  if (parts.year.length !== 4) return false
  const year = toNumber(parts.year)
  const month = toNumber(parts.month)
  const day = toNumber(parts.day)
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return false
  if (month < 1 || month > 12) return false
  if (day < 1) return false
  if (day > getDaysInMonth(year, month)) return false
  const selected = toMidnight(new Date(year, month - 1, day))
  const today = toMidnight(new Date())
  return selected.getTime() <= today.getTime()
}

export const parseBirthDateParts = (value?: string | null) => {
  if (!value) return undefined
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) return undefined
  const [, year, monthRaw, dayRaw] = match
  const parts = {
    year,
    month: monthRaw.padStart(2, '0'),
    day: dayRaw.padStart(2, '0'),
  }
  if (!isValidBirthDateParts(parts)) return undefined
  return parts
}

export const formatBirthDateParts = (parts: BirthDateParts) => {
  if (!isValidBirthDateParts(parts)) return null
  const month = parts.month.padStart(2, '0')
  const day = parts.day.padStart(2, '0')
  return `${parts.year}-${month}-${day}`
}

export const BirthDateSchema = z
  .object({
    month: z.string(),
    day: z.string(),
    year: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!value.month || !value.day || !value.year) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Birth date is required' })
      return
    }
    if (!isValidBirthDateParts(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid birth date' })
    }
  })
