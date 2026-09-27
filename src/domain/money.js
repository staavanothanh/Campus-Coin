import { amountOutOfRange, invalidInput } from './errors.js'

export const TRANSACTION_TYPES = Object.freeze(['income', 'payment'])
export const CORRECTION_ROLES = Object.freeze(['reversal', 'adjustment', 'replacement'])
export const TRANSFER_DIRECTIONS = Object.freeze(['deposit', 'withdraw'])
export const CATEGORY_STATUSES = Object.freeze(['active', 'disabled', 'retired'])

export function isPositiveVnd(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
}

export function isNonNegativeVnd(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export function isTransactionType(value) {
  return typeof value === 'string' && TRANSACTION_TYPES.includes(value)
}

export function isCorrectionRole(value) {
  return typeof value === 'string' && CORRECTION_ROLES.includes(value)
}

export function isTransferDirection(value) {
  return typeof value === 'string' && TRANSFER_DIRECTIONS.includes(value)
}

export function isCategoryStatus(value) {
  return typeof value === 'string' && CATEGORY_STATUSES.includes(value)
}

export function addSafeIntegers(left, right) {
  assertSafeInteger(left)
  assertSafeInteger(right)
  const result = left + right
  if (!Number.isSafeInteger(result)) throw amountOutOfRange()
  return result
}

export function subtractSafeIntegers(left, right) {
  assertSafeInteger(left)
  assertSafeInteger(right)
  const result = left - right
  if (!Number.isSafeInteger(result)) throw amountOutOfRange()
  return result
}

function assertSafeInteger(value) {
  if (!Number.isSafeInteger(value)) throw invalidInput('amount must be a safe integer')
}

function assertTransactionType(type) {
  if (!isTransactionType(type)) throw invalidInput('transaction type must be income or payment')
}

function assertCorrectionRole(role) {
  if (!isCorrectionRole(role)) throw invalidInput('correction role is invalid')
}

function assertAmount(amountVnd) {
  if (!isPositiveVnd(amountVnd)) throw invalidInput('amount must be a positive safe integer')
}

export function walletDeltaForOriginal(type, amountVnd) {
  assertTransactionType(type)
  assertAmount(amountVnd)
  return type === 'income' ? amountVnd : -amountVnd
}

export function walletDeltaForCorrection(targetType, role, newAmountVnd, targetAmountVnd) {
  assertTransactionType(targetType)
  assertCorrectionRole(role)
  assertAmount(targetAmountVnd)
  if (role === 'reversal') return targetType === 'income' ? -targetAmountVnd : targetAmountVnd
  assertAmount(newAmountVnd)
  const amountDifference = subtractSafeIntegers(newAmountVnd, targetAmountVnd)
  return targetType === 'income' ? amountDifference : -amountDifference
}
