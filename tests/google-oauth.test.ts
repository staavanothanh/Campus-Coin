import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createGoogleOAuthProvider,
  GoogleOAuthError,
  readGoogleOAuthConfig,
  type GoogleOAuthClient,
  type GoogleOAuthConfig,
} from '../src/infrastructure/google-oauth.ts';

const config: GoogleOAuthConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'https://campus.example/api/v1/auth/google/callback',
  sessionSecret: 'test-session-secret-longer-than-thirty-two-bytes',
  secureCookie: true,
};

function fakeClient(): GoogleOAuthClient {
  return {
    async createAuthorizationUrl(state, nonce) {
      return { url: `https://accounts.google.com/o/oauth2/v2/auth?state=${state}&nonce=${nonce}`, codeVerifier: 'test-code-verifier' };
    },
    async verifyCode(code, codeVerifier, nonce) {
      assert.equal(code, 'one-time-code');
      assert.equal(codeVerifier, 'test-code-verifier');
      assert.ok(nonce.length > 20);
      return { subject: 'google-subject-1', email: 'student@example.com', displayName: 'Student' };
    },
  };
}

function readCookieValue(cookie: string) {
  const pair = cookie.split(';')[0];
  return pair?.slice(pair.indexOf('=') + 1) || '';
}

test('Google OAuth requires all settings and a valid callback URL', () => {
  assert.equal(readGoogleOAuthConfig({}), null);
  assert.throws(() => readGoogleOAuthConfig({
    GOOGLE_OAUTH_CLIENT_ID: 'id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
  }));
  assert.throws(() => readGoogleOAuthConfig({
    GOOGLE_OAUTH_CLIENT_ID: 'id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
    GOOGLE_OAUTH_REDIRECT_URI: 'https://campus.example/other',
    SESSION_SECRET: '01234567890123456789012345678901',
  }));
});

test('Google OAuth keeps state, nonce and PKCE verifier inside a signed host cookie', async () => {
  const provider = createGoogleOAuthProvider(config, fakeClient());
  const started = await provider.start('login');
  assert.match(started.cookie, /^__Host-cc_google_flow=/);
  assert.match(started.cookie, /HttpOnly/);
  assert.match(started.cookie, /Secure/);
  assert.match(started.cookie, /SameSite=Lax/);

  const url = new URL(started.url);
  const result = await provider.complete(
    new URLSearchParams({ state: url.searchParams.get('state') || '', code: 'one-time-code' }),
    readCookieValue(started.cookie),
  );
  assert.equal(result.mode, 'login');
  assert.equal(result.identity.subject, 'google-subject-1');
  assert.equal(result.identity.email, 'student@example.com');
});

test('Google authorization request asks only for sign-in scopes and uses PKCE S256', async () => {
  const provider = createGoogleOAuthProvider(config);
  const started = await provider.start('login');
  const url = new URL(started.url);
  assert.equal(url.searchParams.get('scope'), 'openid email profile');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(url.searchParams.get('code_challenge'));
  assert.ok(url.searchParams.get('state'));
  assert.ok(url.searchParams.get('nonce'));
  assert.equal(url.searchParams.has('access_type'), false);
});

test('Google OAuth rejects changed cookie, mismatched state and provider cancellation', async () => {
  const provider = createGoogleOAuthProvider(config, fakeClient());
  const started = await provider.start('login');
  const cookieValue = readCookieValue(started.cookie);
  const url = new URL(started.url);
  const state = url.searchParams.get('state') || '';

  await assert.rejects(
    provider.complete(new URLSearchParams({ state, code: 'one-time-code' }), `${cookieValue}x`),
    (error: unknown) => error instanceof GoogleOAuthError && error.code === 'GOOGLE_FLOW_INVALID',
  );
  await assert.rejects(
    provider.complete(new URLSearchParams({ state: 'wrong-state', code: 'one-time-code' }), cookieValue),
    (error: unknown) => error instanceof GoogleOAuthError && error.code === 'GOOGLE_FLOW_INVALID',
  );
  await assert.rejects(
    provider.complete(new URLSearchParams({ state, error: 'access_denied' }), cookieValue),
    (error: unknown) => error instanceof GoogleOAuthError && error.code === 'GOOGLE_CANCELLED',
  );
});

test('Google OAuth link flow remembers the signed-in owner', async () => {
  const provider = createGoogleOAuthProvider(config, fakeClient());
  const started = await provider.start('link', 'user-42');
  const url = new URL(started.url);
  const result = await provider.complete(
    new URLSearchParams({ state: url.searchParams.get('state') || '', code: 'one-time-code' }),
    readCookieValue(started.cookie),
  );
  assert.equal(result.mode, 'link');
  assert.equal(result.userId, 'user-42');
});

test('Google OAuth flow cookie expires after ten minutes', async () => {
  const originalNow = Date.now;
  const startTime = originalNow();
  Date.now = () => startTime;
  try {
    const provider = createGoogleOAuthProvider(config, fakeClient());
    const started = await provider.start('login');
    const url = new URL(started.url);
    Date.now = () => startTime + 10 * 60 * 1000 + 1;
    await assert.rejects(
      provider.complete(
        new URLSearchParams({ state: url.searchParams.get('state') || '', code: 'one-time-code' }),
        readCookieValue(started.cookie),
      ),
      (error: unknown) => error instanceof GoogleOAuthError && error.code === 'GOOGLE_FLOW_INVALID',
    );
  } finally {
    Date.now = originalNow;
  }
});
