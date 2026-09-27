import assert from 'node:assert/strict'
import test from 'node:test'
import {
  HCMC_TIMEZONE,
  currentMonthKey,
  isMonthKey,
  monthKeyOf,
  monthRangeUtc,
} from '../../src/domain/period.js'
import { DomainError } from '../../src/domain/errors.js'

test('month keys use the canonical YYYY-MM form', () => {
  assert.equal(HCMC_TIMEZONE, 'Asia/Ho_Chi_Minh')
  assert.equal(isMonthKey('2026-09'), true)
  for (const value of ['2026-1', '2026-13', '2026/09', '', 202609]) assert.equal(isMonthKey(value), false)
})

test('month range is HCMC-local half-open UTC interval including year transitions', () => {
  const september = monthRangeUtc('2026-09')
  assert.equal(new Date(september.startUtcMs).toISOString(), '2026-08-31T17:00:00.000Z')
  assert.equal(new Date(september.endExclusiveUtcMs).toISOString(), '2026-09-30T17:00:00.000Z')
  const january = monthRangeUtc('2026-01')
  assert.equal(new Date(january.startUtcMs).toISOString(), '2025-12-31T17:00:00.000Z')
  assert.equal(new Date(january.endExclusiveUtcMs).toISOString(), '2026-01-31T17:00:00.000Z')
  const earlyYear = monthRangeUtc('0001-01')
  assert.equal(new Date(earlyYear.startUtcMs).toISOString(), '0000-12-31T17:00:00.000Z')
  assert.equal(new Date(earlyYear.endExclusiveUtcMs).toISOString(), '0001-01-31T17:00:00.000Z')
  assert.throws(() => monthRangeUtc('2026-13'), (error) => error instanceof DomainError && error.code === 'INVALID_INPUT')
})

test('instant-to-month conversion honors both sides of HCMC month boundary', () => {
  assert.equal(monthKeyOf(Date.parse('2026-08-31T16:59:59.999Z')), '2026-08')
  assert.equal(monthKeyOf(Date.parse('2026-08-31T17:00:00.000Z')), '2026-09')
  assert.equal(monthKeyOf(Date.parse('2026-09-30T17:00:00.000Z')), '2026-10')
  assert.throws(() => monthKeyOf(Number.MAX_SAFE_INTEGER), (error) => error instanceof DomainError && error.code === 'INVALID_INPUT')
  assert.throws(() => monthKeyOf(Number.NaN), DomainError)
})

test('current month key is deterministic for the supplied instant', () => {
  assert.equal(currentMonthKey(Date.parse('2026-09-24T03:00:00.000Z')), '2026-09')
})
