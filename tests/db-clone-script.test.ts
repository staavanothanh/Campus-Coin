import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { allMigrationsAreApplied } from '../scripts/db-clone-status.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(projectRoot, 'scripts', 'verify-db-clone.js');

test('DB clone runner stops before checks when the clone name is wrong', () => {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, CAMPUS_COIN_DB_NAME: 'campus_coin' },
  });

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  assert.equal(result.status, 1);
  assert.match(output, /CAMPUS_COIN_DB_NAME=campus_coin_done/);
  assert.match(output, /No database check has been started/);
  assert.doesNotMatch(output, /db:preflight/);
});

test('DB clone runner stops when migration status contains pending items', () => {
  const output = [
    'Migrations dir: db/migrations',
    'applied   0001  0001_initial_schema.sql',
    'pending   0002  0002_next_change.sql',
  ].join('\n');

  assert.equal(allMigrationsAreApplied(output), false);
});

test('DB clone runner continues when all migration statuses are applied', () => {
  const output = [
    'Migrations dir: db/migrations',
    'applied   0001  0001_initial_schema.sql',
    'applied   0002  0002_next_change.sql',
  ].join('\n');

  assert.equal(allMigrationsAreApplied(output), true);
});

test('DB clone runner stops when migration status is empty or unrecognized', () => {
  assert.equal(allMigrationsAreApplied(''), false);
  assert.equal(allMigrationsAreApplied('Migration status changed'), false);
});
