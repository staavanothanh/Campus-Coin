import { invalidInput } from './errors.js'

export const HCMC_TIMEZONE = 'Asia/Ho_Chi_Minh'
export const HCMC_UTC_OFFSET_MS = 7 * 60 * 60 * 1000
const GREGORIAN_CYCLE_MS = 146097 * 24 * 60 * 60 * 1000

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

export function isMonthKey(value) {
  return typeof value === 'string' && MONTH_PATTERN.test(value)
}

export function monthKeyOf(utcMs) {
  if (!Number.isSafeInteger(utcMs)) throw invalidInput('UTC timestamp must be a safe integer')
  const localMs = utcMs + HCMC_UTC_OFFSET_MS
  const local = new Date(localMs)
  if (!Number.isSafeInteger(localMs) || !Number.isFinite(local.getTime())) {
    throw invalidInput('UTC timestamp is outside the supported date range')
  }
  const year = local.getUTCFullYear()
  if (year < 0 || year > 9999) throw invalidInput('UTC timestamp is outside the supported month range')
  const month = String(local.getUTCMonth() + 1).padStart(2, '0')
  return `${String(year).padStart(4, '0')}-${month}`
}

export function currentMonthKey(nowMs = Date.now()) {
  return monthKeyOf(nowMs)
}

export function monthRangeUtc(monthKey) {
  const match = typeof monthKey === 'string' ? MONTH_PATTERN.exec(monthKey) : null
  if (match === null) throw invalidInput('month must use YYYY-MM format')
  const year = Number(match[1])
  const month = Number(match[2])
  const startUtcMs = utcMonthStart(year, month - 1) - HCMC_UTC_OFFSET_MS
  const endExclusiveUtcMs = utcMonthStart(year, month) - HCMC_UTC_OFFSET_MS
  return { startUtcMs, endExclusiveUtcMs }
}
function utcMonthStart(year, month) {
  const normalizedYear = year < 100 ? year + 400 : year
  const cycleAdjustment = year < 100 ? GREGORIAN_CYCLE_MS : 0
  return Date.UTC(normalizedYear, month, 1) - cycleAdjustment
}
