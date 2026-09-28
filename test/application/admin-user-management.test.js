import test from 'node:test';
import assert from 'node:assert/strict';
import { maskEmail, listAdminUsers, setAdminUserStatus, getAdminMetrics } from '../../src/application/admin.service.ts';
import { DomainError } from '../../src/domain/errors.ts';

function baseDb() {
  return {
    query: async () => { throw new Error('unexpected query'); },
    getConnection: async () => { throw new Error('unexpected connection'); },
  };
}

test('maskEmail keeps a short local prefix and the domain', () => {
  assert.equal(maskEmail('meoluoitt1@gmail.com'), 'me********@gmail.com');
  assert.equal(maskEmail('ab@x.io'), 'a*@x.io');
  assert.equal(maskEmail('a@x.io'), '***');
});

test('admin users listing rejects non-admin actors before touching the database', async () => {
  await assert.rejects(
    () => listAdminUsers(baseDb(), { userId: 1, role: 'user' }, undefined, 20),
    (error) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});

test('admin users listing rejects invalid limits and cursors', async () => {
  await assert.rejects(() => listAdminUsers(baseDb(), { userId: 1, role: 'admin' }, undefined, 0), /limit/);
  await assert.rejects(() => listAdminUsers(baseDb(), { userId: 1, role: 'admin' }, undefined, 101), /limit/);
  await assert.rejects(() => listAdminUsers(baseDb(), { userId: 1, role: 'admin' }, 'garbage', 20), /invalid cursor/);
});

test('admin status change cannot target the acting admin account', async () => {
  const input = {
    actor: { userId: 7, role: 'admin' },
    userId: 7,
    status: 'disabled',
    reason: 'self disable attempt',
    idempotencyKey: 'k1',
    requestHash: 'h1',
  };
  await assert.rejects(() => setAdminUserStatus(baseDb(), input), /own account/);
});

test('admin status change validates status and reason before database access', async () => {
  await assert.rejects(
    () => setAdminUserStatus(baseDb(), { actor: { userId: 1, role: 'admin' }, userId: 2, status: 'suspended', reason: 'ok reason', idempotencyKey: 'k1', requestHash: 'h1' }),
    /invalid user status/,
  );
  await assert.rejects(
    () => setAdminUserStatus(baseDb(), { actor: { userId: 1, role: 'admin' }, userId: 2, status: 'disabled', reason: 'ok', idempotencyKey: 'k1', requestHash: 'h1' }),
    /reason required/,
  );
  await assert.rejects(
    () => setAdminUserStatus(baseDb(), { actor: { userId: 1, role: 'admin' }, userId: 2, status: 'disabled', reason: 'x'.repeat(501), idempotencyKey: 'k1', requestHash: 'h1' }),
    /reason required/,
  );
});

test('admin status change blocks non-admin actors', async () => {
  await assert.rejects(
    () => setAdminUserStatus(baseDb(), { actor: { userId: 1, role: 'user' }, userId: 2, status: 'disabled', reason: 'ok reason', idempotencyKey: 'k1', requestHash: 'h1' }),
    (error) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});

test('admin metrics aggregate users, issues and audit from their own queries', async () => {
  let queryCount = 0;
  const db = {
    getConnection: async () => { throw new Error('unexpected connection'); },
    query: async (sql) => {
      queryCount += 1;
      if (sql.includes('FROM users') && !sql.includes('GROUP BY') && !sql.includes("status = 'active'")) {
        return [[{ total: 12, verified: 10 }], undefined];
      }
      if (sql.includes("SUM(status = 'active')")) {
        return [[{ active: 9, disabled: 3 }], undefined];
      }
      if (sql.includes('GROUP BY status')) {
        return [[{ status: 'open', count: 3 }, { status: 'in_triage', count: 2 }, { status: 'resolved', count: 4 }, { status: 'closed', count: 1 }], undefined];
      }
      if (sql.includes('GROUP BY priority')) {
        return [[{ priority: 'P0', count: 2 }, { priority: 'P1', count: 5 }, { priority: 'P2', count: 3 }], undefined];
      }
      if (sql.includes('GROUP BY outcome')) {
        return [[{ outcome: 'success', count: 40 }, { outcome: 'failure', count: 7 }], undefined];
      }
      throw new Error(`unexpected sql in test: ${sql}`);
    },
  };
  const metrics = await getAdminMetrics(db);
  assert.deepEqual(metrics, {
    users: { totalUsers: 12, verifiedUsers: 10, activeUsers: 9, disabledUsers: 3 },
    issues: {
      total: 10,
      byStatus: { open: 3, in_triage: 2, resolved: 4, closed: 1 },
      byPriority: { P0: 2, P1: 5, P2: 3 },
    },
    audit: { success: 40, failure: 7 },
  });
  assert.equal(queryCount, 5);
});

test('admin status change is idempotent on replay and writes a single audit row', async () => {
  const calls = [];
  let status = 'active';
  let storedIdempotency = null;
  const conn = {
    query: async (sql, params = []) => {
      calls.push(sql.includes('audit_events') ? 'audit' : sql.split(/\s+/)[0]);
      if (sql.includes('mutation_idempotency') && sql.includes('WHERE user_id = ? AND scope')) {
        return [storedIdempotency === null ? [] : [storedIdempotency], undefined];
      }
      if (sql.includes('INSERT INTO mutation_idempotency')) {
        storedIdempotency = { id: 55, request_hash: 'h1', response_json: null };
        return [{ insertId: 55 }, undefined];
      }
      if (sql.includes('UPDATE mutation_idempotency')) {
        storedIdempotency.response_json = params[1];
        return [{ affectedRows: 1 }, undefined];
      }
      if (sql.includes('FROM users') && sql.includes('SELECT')) {
        if (sql.includes('WHERE id = ?') && params[0] === 2) {
          return [[{ id: 2, email: 'ma@example.com', display_name: 'User 2', role: 'user', status, locale: 'vi', created_at: new Date('2026-09-28T00:00:00Z') }], undefined];
        }
        return [[], undefined];
      }
      if (sql.includes('UPDATE users')) { status = String(params[0]); return [{ affectedRows: 1 }, undefined]; }
      if (sql.includes('INSERT INTO audit_events')) return [{ insertId: 77 }, undefined];
      throw new Error(`unexpected sql in test: ${sql}`);
    },
    beginTransaction: async () => { calls.push('begin'); },
    commit: async () => { calls.push('commit'); },
    rollback: async () => { calls.push('rollback'); },
    release: async () => { calls.push('release'); },
  };
  const db = {
    query: async () => [[], undefined],
    getConnection: async () => conn,
  };

  const first = await setAdminUserStatus(db, {
    actor: { userId: 1, role: 'admin' }, userId: 2, status: 'disabled', reason: 'ok reason', idempotencyKey: 'k1', requestHash: 'h1',
  });
  assert.equal(first.status, 'disabled');
  assert.equal(first.id, '2');
  assert.equal(calls.filter((c) => c === 'audit').length, 1);

  const replay = await setAdminUserStatus(db, {
    actor: { userId: 1, role: 'admin' }, userId: 2, status: 'disabled', reason: 'ok reason', idempotencyKey: 'k1', requestHash: 'h1',
  });
  assert.equal(replay.status, 'disabled');
  assert.equal(calls.filter((c) => c === 'audit').length, 1, 'replay must not insert a second audit row');
  assert.ok(calls.includes('begin') && calls.includes('commit'));
});