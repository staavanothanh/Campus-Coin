import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertContract } from './helpers/contract.ts';

test('cashflow plan options contract allows both disable and reactivation requests', () => {
  assert.doesNotThrow(() => assertContract('UpdateCashflowPlanOptionsRequest', { isActive: false }));
  assert.doesNotThrow(() => assertContract('UpdateCashflowPlanOptionsRequest', { isActive: true }));
  assert.throws(() => assertContract('UpdateCashflowPlanOptionsRequest', {}), /minProperties 1/);
  assert.throws(
    () => assertContract('UpdateCashflowPlanOptionsRequest', { unexpected: true }),
    /additional property 'unexpected' is not allowed/,
  );
  assert.throws(
    () => assertContract('UpdateCashflowPlanOptionsRequest', JSON.parse('{"toString":true}')),
    /additional property 'toString' is not allowed/,
  );
  assert.throws(
    () => assertContract('UpdateCashflowPlanOptionsRequest', { isActive: 'true' }),
    /expected boolean/,
  );
});

test('contract validator checks schema-valued additionalProperties', () => {
  assert.doesNotThrow(() => assertContract('Readiness', { status: 'pass', checks: { database: 'pass' } }));
  assert.throws(
    () => assertContract('Readiness', { status: 'pass', checks: { database: 42 } }),
    /expected string/,
  );
});
