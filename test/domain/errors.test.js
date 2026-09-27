import assert from 'node:assert/strict'
import test from 'node:test'
import { DomainError, insufficientWalletBalance, idempotencyConflict, invalidInput, notFound } from '../../src/domain/errors.js'

test('domain errors expose stable locale-neutral code and API-layer status', () => {
  const cases = [
    [invalidInput('invalid amount'), 'INVALID_INPUT', 422],
    [insufficientWalletBalance(), 'INSUFFICIENT_WALLET_BALANCE', 422],
    [idempotencyConflict(), 'IDEMPOTENCY_CONFLICT', 409],
    [notFound(), 'NOT_FOUND', 404],
  ]
  for (const [error, code, status] of cases) {
    assert.ok(error instanceof DomainError)
    assert.equal(error.name, 'DomainError')
    assert.equal(error.code, code)
    assert.equal(error.status, status)
    assert.equal(typeof error.message, 'string')
  }
})

test('domain errors retain their public message without leaking stack or provider payload', () => {
  const error = invalidInput('amount must be a positive integer')
  assert.equal(error.message, 'amount must be a positive integer')
  assert.equal(error.code.includes('secret'), false)
  assert.equal(error.message.includes('stack'), false)
})
