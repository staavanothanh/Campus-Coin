import { spawnSync } from 'node:child_process';
import { allMigrationsAreApplied } from './db-clone-status.js';

const cloneDatabase = 'campus_coin_done';

if (process.env.CAMPUS_COIN_DB_NAME !== cloneDatabase) {
  console.error(`STOP: set CAMPUS_COIN_DB_NAME=${cloneDatabase} before running this check.`);
  console.error('No database check has been started.');
  process.exit(1);
}

const readOnlyChecks = ['db:preflight', 'db:status'];

for (const scriptName of readOnlyChecks) {
  const result = runNpmScript(scriptName);

  if (scriptName === 'db:status' && !allMigrationsAreApplied(result.stdout ?? '')) {
    console.error('STOP: migration status is pending or could not be confirmed. No test database was created.');
    process.exit(1);
  }
}

console.log('Clone checks passed. Next, tests will create and delete temporary test databases on this MySQL server.');

process.env.CAMPUS_COIN_TEST_DB = '1';
process.env.CAMPUS_COIN_DB_NAME = 'campus_coin_test_verify';

runNpmScript('db:datatest');
runNodeTest('test/mysql.integration.test.ts');
runNodeTest('test/e2e.contract.smoke.test.ts');
runNodeTest('test/auth.mysql.integration.test.ts');

function runNpmScript(scriptName) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['run', scriptName], {
    env: process.env,
    shell: process.platform === 'win32',
    encoding: 'utf8',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  stopIfFailed(result, `npm run ${scriptName}`);
  return result;
}

function runNodeTest(testFile) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', testFile], {
    env: process.env,
    stdio: 'inherit',
  });

  stopIfFailed(result, testFile);
}

function stopIfFailed(result, label) {
  if (result.error) {
    console.error(`Could not start ${label}.`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
