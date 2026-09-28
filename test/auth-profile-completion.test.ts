import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requiresProfileCompletion } from '../src/features/auth/security.js';

test('profile completion is required only when display name or local password is missing', () => {
  assert.equal(requiresProfileCompletion('Campus Student', true), false);
  assert.equal(requiresProfileCompletion('   ', true), true);
  assert.equal(requiresProfileCompletion('Campus Student', false), true);
});
