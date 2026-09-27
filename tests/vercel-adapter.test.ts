import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';
const VALID_SECRETS = {
  OTP_SECRET: 'o'.repeat(32),
  SESSION_SECRET: 's'.repeat(32),
  AUTH_RATE_LIMIT_SECRET: 'r'.repeat(32),
};

test('Vercel handler rejects missing or weak OTP and session secrets before pool initialization', () => {
  const entrypoint = new URL('../api/v1/[...path].ts', import.meta.url).href;
  for (const name of ['OTP_SECRET', 'SESSION_SECRET'] as const) {
    for (const value of [undefined, 'x'.repeat(31)]) {
      const resultEnv = {
        ...VALID_SECRETS,
        [name]: value,
        VERCEL: '1',
        CAMPUS_COIN_DB_HOST: undefined,
        CAMPUS_COIN_DB_NAME: undefined,
        CAMPUS_COIN_DB_USER: undefined,
        CAMPUS_COIN_DB_PASSWORD: undefined,
      };
      const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', `import(${JSON.stringify(entrypoint)})`], {
        env: resultEnv as NodeJS.ProcessEnv,
        encoding: 'utf8',
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Thiếu hoặc sai định dạng biến cấu hình auth bắt buộc/);
    }
  }
});

test('Vercel handler returns health API without caching with strong synthetic secrets', () => {
  const entrypoint = new URL('../api/v1/[...path].ts', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', `
    import { createServer } from 'node:http';
    const { default: handler } = await import(${JSON.stringify(entrypoint)});
    const server = createServer((request, response) => { void handler(request, response); });
    server.listen(0, '127.0.0.1', async () => {
      const address = server.address();
      if (!address || typeof address === 'string') process.exitCode = 1;
      else {
        const response = await fetch('http://127.0.0.1:' + address.port + '/api/v1/health');
        const body = await response.json();
        if (response.status !== 200 || response.headers.get('cache-control') !== 'no-store, private' || body.data.status !== 'pass') process.exitCode = 1;
        server.close();
      }
    });
  `], {
    env: {
      ...VALID_SECRETS,
      VERCEL: '0',
    },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
});
