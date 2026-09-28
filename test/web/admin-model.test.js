import test from 'node:test';
import assert from 'node:assert/strict';
import { issueQueuePath, isIssuePriority, isIssueStatus, isAmbiguousMutation } from '../../src/web/features/admin/model.ts';

test('issue queue filters use canonical enums and bounded pagination', () => {
  assert.equal(issueQueuePath('', ''), '/admin/issues?limit=20');
  assert.equal(issueQueuePath('in_triage', 'P0'), '/admin/issues?limit=20&status=in_triage&priority=P0');
  assert.equal(isIssueStatus('in_triage'), true);
  assert.equal(isIssueStatus('assigned'), false);
  assert.equal(isIssuePriority('P3'), false);
});

test('note retries retain idempotency only for uncertain commit outcomes', () => {
  for (const status of [undefined, 408, 500, 503]) assert.equal(isAmbiguousMutation(status), true);
  for (const status of [401, 403, 409, 422, 429]) assert.equal(isAmbiguousMutation(status), false);
});
