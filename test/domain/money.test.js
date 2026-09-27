import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addSafeIntegers,
  isNonNegativeVnd,
  isPositiveVnd,
  isTransactionType,
  subtractSafeIntegers,
  walletDeltaForCorrection,
  walletDeltaForOriginal,
} from '../../src/domain/money.js'
import { DomainError } from '../../src/domain/errors.js'

test('VND validators accept only safe integer amounts within their sign contract', () => {
  assert.equal(isPositiveVnd(1), true)
  assert.equal(isPositiveVnd(Number.MAX_SAFE_INTEGER), true)
  assert.equal(isPositiveVnd(0), false)
  assert.equal(isPositiveVnd(-1), false)
  assert.equal(isPositiveVnd(1.25), false)
  assert.equal(isPositiveVnd(Number.MAX_SAFE_INTEGER + 1), false)
  assert.equal(isPositiveVnd('100'), false)
  assert.equal(isNonNegativeVnd(0), true)
  assert.equal(isNonNegativeVnd(Number.MAX_SAFE_INTEGER), true)
  assert.equal(isNonNegativeVnd(-1), false)
  assert.equal(isNonNegativeVnd(Number.NaN), false)
})

test('safe integer arithmetic preserves representable boundaries and rejects invalid values and overflow', () => {
  const max = Number.MAX_SAFE_INTEGER
  const min = Number.MIN_SAFE_INTEGER
  assert.equal(addSafeIntegers(max - 1, 1), max)
  assert.equal(subtractSafeIntegers(min + 1, 1), min)
  assert.throws(() => addSafeIntegers(max, 1), (error) => error instanceof DomainError && error.code === 'AMOUNT_OUT_OF_RANGE')
  assert.throws(() => subtractSafeIntegers(min, 1), (error) => error instanceof DomainError && error.code === 'AMOUNT_OUT_OF_RANGE')
  assert.throws(() => addSafeIntegers(max + 1, 0), (error) => error instanceof DomainError && error.code === 'INVALID_INPUT')
})

test('wallet effects distinguish income and payment without admitting other transaction types', () => {
  assert.equal(isTransactionType('income'), true)
  assert.equal(isTransactionType('payment'), true)
  assert.equal(isTransactionType('expense'), false)
  assert.equal(walletDeltaForOriginal('income', 100_000), 100_000)
  assert.equal(walletDeltaForOriginal('payment', 200_000), -200_000)
  assert.throws(() => walletDeltaForOriginal('expense', 1), DomainError)
  assert.throws(() => walletDeltaForOriginal('income', 0), DomainError)
})

test('correction effects reverse originals or apply the safe replacement delta', () => {
  assert.equal(walletDeltaForCorrection('income', 'reversal', 100, 100), -100)
  assert.equal(walletDeltaForCorrection('payment', 'reversal', 80, 80), 80)
  assert.equal(walletDeltaForCorrection('income', 'reversal', 999, 100), -100)
  assert.equal(walletDeltaForCorrection('payment', 'reversal', 1, 80), 80)
  assert.equal(walletDeltaForCorrection('income', 'reversal', undefined, 100), -100)
  assert.equal(walletDeltaForCorrection('payment', 'reversal', null, 80), 80)
  assert.equal(walletDeltaForCorrection('income', 'replacement', 150, 100), 50)
  assert.equal(walletDeltaForCorrection('income', 'adjustment', 60, 100), -40)
  assert.equal(walletDeltaForCorrection('payment', 'replacement', 100, 80), -20)
  assert.equal(walletDeltaForCorrection('payment', 'adjustment', 50, 80), 30)
  assert.throws(() => walletDeltaForCorrection('income', 'other', 2, 1), DomainError)
  assert.throws(() => walletDeltaForCorrection('income', 'adjustment', 0, 1), DomainError)
  assert.throws(() => walletDeltaForCorrection('income', 'adjustment', Number.MAX_SAFE_INTEGER + 1, 1), DomainError)
})
