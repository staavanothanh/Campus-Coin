import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createApiServer } from '../src/routes/api.js';
import { getPool, resetPool } from '../src/infrastructure/db/pool.ts';
import { hashSession } from '../src/features/auth/security.js';
import type { GoogleIdentity, GoogleOAuthMode, GoogleOAuthProvider } from '../src/infrastructure/google-oauth.ts';
import { createMysqlHarness } from './helpers/mysql-harness.ts';

const ENABLED = process.env.CAMPUS_COIN_TEST_DB === '1';

if (!ENABLED) {
  test('email/password auth MySQL integration', { skip: 'Gated: cần CAMPUS_COIN_TEST_DB=1 và MySQL cô lập' }, () => undefined);
} else {
  const harness = createMysqlHarness();
  const sentOtps: Array<{ email: string; code: string; purpose: 'registration' | 'password_reset' }> = [];
  let failEmailDelivery = false;
  let nextGoogleIdentity: GoogleIdentity = {
    subject: 'test-google-subject',
    email: 'google@example.test',
    displayName: 'Google Student',
  };
  const googleOAuth: GoogleOAuthProvider = {
    enabled: true,
    cookieName: 'test_google_flow',
    async start(mode: GoogleOAuthMode, userId?: string) {
      const state = randomUUID();
      const flow = Buffer.from(JSON.stringify({ state, mode, userId })).toString('base64url');
      return {
        url: `https://accounts.example.test/auth?state=${state}`,
        cookie: `test_google_flow=${flow}; Path=/; HttpOnly; SameSite=Lax`,
      };
    },
    async complete(search, cookieValue) {
      const flow = JSON.parse(Buffer.from(cookieValue, 'base64url').toString('utf8')) as {
        state: string;
        mode: GoogleOAuthMode;
        userId?: string;
      };
      if (search.get('state') !== flow.state) throw new Error('invalid test flow');
      return { ...flow, identity: nextGoogleIdentity };
    },
    clearCookie() {
      return 'test_google_flow=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
    },
  };
  const server = createApiServer({
    googleOAuth,
    emailSender: async (email, code, purpose) => {
      if (failEmailDelivery) throw new Error('test email provider unavailable');
      sentOtps.push({ email, code, purpose });
    },
  });
  let baseUrl = '';

  before(async () => {
    process.env.OTP_SECRET = 'otp-test-secret-0123456789abcdef';
    process.env.SESSION_SECRET = 'session-test-secret-0123456789abcdef';
    process.env.AUTH_RATE_LIMIT_SECRET = 'rate-limit-test-secret-0123456789';
    process.env.CLIENT_ORIGIN = 'http://127.0.0.1:5173';
    process.env.TRUST_PROXY = 'true';
    process.env.TRUSTED_PROXY_IPS = '127.0.0.1';
    process.env.NODE_ENV = 'production';
    await harness.start();
    await new Promise<void>(resolve => server.listen(0, resolve));
    const address = server.address();
    if (typeof address !== 'object' || !address) throw new Error('API server did not start');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await harness.stop();
  });

  function sentOtp(email: string, purpose: 'registration' | 'password_reset') {
    const result = sentOtps.filter(item => item.email === email && item.purpose === purpose).at(-1);
    if (!result) throw new Error('expected OTP was not sent');
    return result.code;
  }

  async function call(
    method: string,
    path: string,
    options: { body?: Record<string, unknown>; cookie?: string; csrf?: string; key?: string; ip?: string; origin?: string } = {},
  ) {
    const headers: Record<string, string> = {
      origin: options.origin ?? process.env.CLIENT_ORIGIN!,
      'x-forwarded-for': options.ip ?? '198.51.100.10',
    };
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.cookie) headers.cookie = options.cookie;
    if (options.csrf) headers['x-csrf-token'] = options.csrf;
    if (options.key) headers['idempotency-key'] = options.key;
    return fetch(`${baseUrl}${path}`, {
      method,
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  }

  function sessionCookie(response: Response) {
    const value = response.headers.get('set-cookie')?.split(';', 1)[0];
    if (!value?.startsWith('cc_session=')) throw new Error('session cookie was not set');
    return value;
  }

  test('register → verify OTP → login/session → wallet and issue → forgot/reset → revoke/logout/expiry', async () => {
    const email = `flow-${randomUUID()}@example.test`;
    const ip = '198.51.100.10';
    const password = 'InitialPassword123';
    const registration = await call('POST', '/api/v1/auth/register', { body: { email }, ip });
    assert.equal(registration.status, 201);

    const otp = sentOtp(email, 'registration');
    const wrongOtp = otp === '000000' ? '000001' : '000000';
    const invalidOtp = await call('POST', '/api/v1/auth/verify-registration', {
      body: { email, fullName: 'Student One', password, otp: wrongOtp, locale: 'en' }, ip,
    });
    assert.equal(invalidOtp.status, 422);
    assert.equal((await invalidOtp.json()).error.code, 'OTP_INVALID');

    const cooldown = await call('POST', '/api/v1/auth/resend-otp', { body: { email, purpose: 'registration' }, ip });
    assert.equal(cooldown.status, 429);
    assert.ok(Number(cooldown.headers.get('Retry-After')) > 0);

    const verified = await call('POST', '/api/v1/auth/verify-registration', {
      body: { email, fullName: 'Student One', password, otp, locale: 'en' }, ip,
    });
    assert.equal(verified.status, 200);

    const badLogin = await call('POST', '/api/v1/auth/login', { body: { email, password: 'WrongPassword123' }, ip });
    assert.equal(badLogin.status, 401);
    const login = await call('POST', '/api/v1/auth/login', { body: { email, password }, ip });
    assert.equal(login.status, 200);
    const sessionData = (await login.json()).data;
    const cookie = sessionCookie(login);
    const token = cookie.slice('cc_session='.length);
    assert.match(login.headers.get('set-cookie') ?? '', /HttpOnly/);
    assert.match(login.headers.get('set-cookie') ?? '', /SameSite=Lax/);
    assert.match(login.headers.get('set-cookie') ?? '', /Secure/);
    assert.match(login.headers.get('set-cookie') ?? '', /Max-Age=86400/);
    assert.equal(typeof sessionData.csrfToken, 'string');

    const session = await call('GET', '/api/v1/auth/session', { cookie, ip });
    assert.equal(session.status, 200);
    const user = (await session.json()).data.user;
    assert.equal(user.email, email);
    assert.equal((await call('GET', `/api/v1/users/${Number(user.id) + 1}`, { cookie, ip })).status, 403);
    const badOrigin = await call('POST', '/api/v1/wallet/baseline', {
      body: { initialBalanceVnd: 10_000 }, cookie, csrf: sessionData.csrfToken, ip, origin: 'https://example.invalid',
    });
    assert.equal(badOrigin.status, 403);
    const missingCsrf = await call('POST', '/api/v1/wallet/baseline', {
      body: { initialBalanceVnd: 10_000 }, cookie, ip,
    });
    assert.equal(missingCsrf.status, 403);

    const baseline = await call('POST', '/api/v1/wallet/baseline', {
      body: { initialBalanceVnd: 10_000 }, cookie, csrf: sessionData.csrfToken, key: randomUUID(), ip,
    });
    assert.equal(baseline.status, 201);
    const wallet = await call('GET', '/api/v1/wallet', { cookie, ip });
    assert.equal(wallet.status, 200);
    assert.equal((await wallet.json()).data.availableBalanceVnd, 10_000);

    const issueBody = { title: 'Review a test issue', description: 'Test only', category: 'other' };
    const issue = await call('POST', '/api/v1/issues', {
      body: issueBody, cookie, csrf: sessionData.csrfToken, key: randomUUID(), ip,
    });
    assert.equal(issue.status, 201);
    const issueId = (await issue.json()).data.id;
    const myIssues = await call('GET', '/api/v1/issues/me?limit=20', { cookie, ip });
    assert.equal(myIssues.status, 200);
    assert.ok((await myIssues.json()).data.some((item: { id: string }) => item.id === issueId));

    const forgot = await call('POST', '/api/v1/auth/forgot-password', { body: { email }, ip });
    assert.equal(forgot.status, 200);
    const resetOtp = sentOtp(email, 'password_reset');
    const badReset = await call('POST', '/api/v1/auth/reset-password', {
      body: { email, otp: resetOtp === '000000' ? '000001' : '000000', newPassword: 'ChangedPassword123' }, ip,
    });
    assert.equal(badReset.status, 422);
    const reset = await call('POST', '/api/v1/auth/reset-password', {
      body: { email, otp: resetOtp, newPassword: 'ChangedPassword123' }, ip,
    });
    assert.equal(reset.status, 200);
    const reusedResetOtp = await call('POST', '/api/v1/auth/reset-password', {
      body: { email, otp: resetOtp, newPassword: 'AnotherPassword123' }, ip,
    });
    assert.equal(reusedResetOtp.status, 422);
    assert.equal((await call('GET', '/api/v1/auth/session', { cookie, ip })).status, 401);
    const staleLogout = await call('POST', '/api/v1/auth/logout', { cookie, ip });
    assert.equal(staleLogout.status, 200);
    assert.match(staleLogout.headers.get('set-cookie') ?? '', /Max-Age=0/);

    const newLogin = await call('POST', '/api/v1/auth/login', {
      body: { email, password: 'ChangedPassword123' }, ip,
    });
    assert.equal(newLogin.status, 200);
    const newCookie = sessionCookie(newLogin);
    const newSessionData = (await newLogin.json()).data;
    const logout = await call('POST', '/api/v1/auth/logout', {
      cookie: newCookie, csrf: newSessionData.csrfToken, ip,
    });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie') ?? '', /Max-Age=0/);

    const expiryLogin = await call('POST', '/api/v1/auth/login', {
      body: { email, password: 'ChangedPassword123' }, ip,
    });
    const expiryCookie = sessionCookie(expiryLogin);
    await getPool().execute(
      'UPDATE sessions SET expires_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND) WHERE token_hash = ?',
      [hashSession(expiryCookie.slice('cc_session='.length))],
    );
    assert.equal((await call('GET', '/api/v1/auth/session', { cookie: expiryCookie, ip })).status, 401);
  });

  test('OTP hết hạn và vượt max attempts đều bị từ chối', async () => {
    const expiredEmail = `expired-${randomUUID()}@example.test`;
    const expiredIp = '198.51.100.11';
    assert.equal((await call('POST', '/api/v1/auth/register', { body: { email: expiredEmail }, ip: expiredIp })).status, 201);
    const expiredOtp = sentOtp(expiredEmail, 'registration');
    await getPool().execute(
      'UPDATE email_otps SET expires_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND) WHERE email = ? AND purpose = ?',
      [expiredEmail, 'registration'],
    );
    const expired = await call('POST', '/api/v1/auth/verify-registration', {
      body: { email: expiredEmail, fullName: 'Expired User', password: 'Password12345', otp: expiredOtp }, ip: expiredIp,
    });
    assert.equal(expired.status, 422);
    assert.equal((await expired.json()).error.code, 'OTP_INVALID');

    const lockedEmail = `locked-${randomUUID()}@example.test`;
    const lockedIp = '198.51.100.12';
    assert.equal((await call('POST', '/api/v1/auth/register', { body: { email: lockedEmail }, ip: lockedIp })).status, 201);
    const code = sentOtp(lockedEmail, 'registration');
    const wrongCode = code === '000000' ? '000001' : '000000';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await call('POST', '/api/v1/auth/verify-registration', {
        body: { email: lockedEmail, fullName: 'Locked User', password: 'Password12345', otp: wrongCode }, ip: lockedIp,
      });
      assert.equal(response.status, 422);
    }
    const locked = await call('POST', '/api/v1/auth/verify-registration', {
      body: { email: lockedEmail, fullName: 'Locked User', password: 'Password12345', otp: code }, ip: lockedIp,
    });
    assert.equal(locked.status, 429);
    assert.ok(Number(locked.headers.get('Retry-After')) > 0);
  });

  test('OTP cooldown không tiêu quota gửi của register hoặc reset password', async () => {
    const registrationEmail = `cooldown-register-${randomUUID()}@example.test`;
    const registrationIp = '198.51.100.40';
    assert.equal((await call('POST', '/api/v1/auth/register', {
      body: { email: registrationEmail }, ip: registrationIp,
    })).status, 201);
    assert.equal((await call('POST', '/api/v1/auth/resend-otp', {
      body: { email: registrationEmail, purpose: 'registration' }, ip: registrationIp,
    })).status, 429);

    for (let send = 0; send < 2; send += 1) {
      await getPool().execute(
        'UPDATE email_otps SET created_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 61 SECOND) WHERE email = ? AND purpose = ?',
        [registrationEmail, 'registration'],
      );
      assert.equal((await call('POST', '/api/v1/auth/resend-otp', {
        body: { email: registrationEmail, purpose: 'registration' }, ip: registrationIp,
      })).status, 200);
    }
    assert.equal(sentOtps.filter(item => item.email === registrationEmail && item.purpose === 'registration').length, 3);

    const resetEmail = `cooldown-reset-${randomUUID()}@example.test`;
    const resetIp = '198.51.100.41';
    assert.equal((await call('POST', '/api/v1/auth/register', { body: { email: resetEmail }, ip: resetIp })).status, 201);
    const registrationOtp = sentOtp(resetEmail, 'registration');
    assert.equal((await call('POST', '/api/v1/auth/verify-registration', {
      body: { email: resetEmail, fullName: 'Reset User', password: 'Password12345', otp: registrationOtp }, ip: resetIp,
    })).status, 200);

    assert.equal((await call('POST', '/api/v1/auth/forgot-password', { body: { email: resetEmail }, ip: resetIp })).status, 200);
    assert.equal((await call('POST', '/api/v1/auth/forgot-password', { body: { email: resetEmail }, ip: resetIp })).status, 200);
    for (let send = 0; send < 2; send += 1) {
      await getPool().execute(
        'UPDATE email_otps SET created_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 61 SECOND) WHERE email = ? AND purpose = ?',
        [resetEmail, 'password_reset'],
      );
      assert.equal((await call('POST', '/api/v1/auth/forgot-password', { body: { email: resetEmail }, ip: resetIp })).status, 200);
    }
    assert.equal(sentOtps.filter(item => item.email === resetEmail && item.purpose === 'password_reset').length, 3);
  });

  test('login rate-limit áp dụng cho account và IP', async () => {
    const email = `rate-${randomUUID()}@example.test`;
    const ip = '198.51.100.13';
    assert.equal((await call('POST', '/api/v1/auth/register', { body: { email }, ip })).status, 201);
    const otp = sentOtp(email, 'registration');
    assert.equal((await call('POST', '/api/v1/auth/verify-registration', {
      body: { email, fullName: 'Rate User', password: 'Password12345', otp }, ip,
    })).status, 200);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal((await call('POST', '/api/v1/auth/login', { body: { email, password: 'WrongPassword123' }, ip })).status, 401);
    }
    const blocked = await call('POST', '/api/v1/auth/login', { body: { email, password: 'Password12345' }, ip });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('Retry-After')) > 0);
  });

  test('Google không tự gộp email đã có; user phải chủ động kết nối rồi mới đăng nhập được', async () => {
    const email = `google-link-${randomUUID()}@example.test`;
    const ip = '198.51.100.16';
    assert.equal((await call('POST', '/api/v1/auth/register', { body: { email }, ip })).status, 201);
    const otp = sentOtp(email, 'registration');
    assert.equal((await call('POST', '/api/v1/auth/verify-registration', {
      body: { email, fullName: 'Existing User', password: 'Password12345', otp }, ip,
    })).status, 200);
    const emailLogin = await call('POST', '/api/v1/auth/login', { body: { email, password: 'Password12345' }, ip });
    const emailCookie = sessionCookie(emailLogin);
    const emailSession = (await emailLogin.json()).data;

    nextGoogleIdentity = { subject: `google-${randomUUID()}`, email, displayName: 'Existing User' };
    const googleStart = await call('GET', '/api/v1/auth/google/start', { ip });
    const googleState = new URL(googleStart.headers.get('location') || 'https://accounts.example.test').searchParams.get('state');
    const googleFlowCookie = googleStart.headers.get('set-cookie')?.split(';', 1)[0] || '';
    const collision = await call('GET', `/api/v1/auth/google/callback?state=${googleState}&code=test-code`, {
      cookie: googleFlowCookie, ip,
    });
    assert.equal(collision.status, 302);
    assert.match(collision.headers.get('location') || '', /auth_error=link_required/);
    assert.doesNotMatch(collision.headers.get('set-cookie') || '', /cc_session=/);

    const linkStart = await call('POST', '/api/v1/auth/google/link', {
      body: {}, cookie: emailCookie, csrf: emailSession.csrfToken, ip,
    });
    assert.equal(linkStart.status, 200);
    const linkUrl = new URL((await linkStart.json()).data.url);
    const linkFlowCookie = linkStart.headers.get('set-cookie')?.split(';', 1)[0] || '';
    const linked = await call('GET', `/api/v1/auth/google/callback?state=${linkUrl.searchParams.get('state')}&code=test-code`, {
      cookie: `${emailCookie}; ${linkFlowCookie}`, ip,
    });
    assert.equal(linked.status, 302);
    assert.match(linked.headers.get('location') || '', /auth=google_linked/);

    const googleLoginStart = await call('GET', '/api/v1/auth/google/start', { ip });
    const googleLoginState = new URL(googleLoginStart.headers.get('location') || 'https://accounts.example.test').searchParams.get('state');
    const googleLoginFlowCookie = googleLoginStart.headers.get('set-cookie')?.split(';', 1)[0] || '';
    const googleLogin = await call('GET', `/api/v1/auth/google/callback?state=${googleLoginState}&code=test-code`, {
      cookie: googleLoginFlowCookie, ip,
    });
    assert.equal(googleLogin.status, 302);
    assert.match(googleLogin.headers.get('location') || '', /auth=google_login/);
    const googleCookie = sessionCookie(googleLogin);
    const session = await call('GET', '/api/v1/auth/session', { cookie: googleCookie, ip });
    assert.equal(session.status, 200);
    const sessionData = (await session.json()).data;
    assert.equal(sessionData.user.email, email);
    assert.equal(sessionData.user.id, emailSession.user.id);
    assert.equal(sessionData.googleLinked, true);
  });

  test('email provider và database failure trả lỗi tổng quát, không lộ chi tiết', async () => {
    const email = `mail-failure-${randomUUID()}@example.test`;
    failEmailDelivery = true;
    const unavailable = await call('POST', '/api/v1/auth/register', { body: { email }, ip: '198.51.100.14' });
    failEmailDelivery = false;
    assert.equal(unavailable.status, 503);
    const message = await unavailable.json();
    assert.equal(message.error.code, 'EMAIL_UNAVAILABLE');
    assert.equal(sentOtps.some(item => item.email === email), false);
    const [otpRows] = await getPool().execute('SELECT id FROM email_otps WHERE email = ?', [email]);
    assert.equal((otpRows as unknown[]).length, 0);

    resetPool();
    process.env.CAMPUS_COIN_DB_NAME = 'campus_coin_missing_database_for_test';
    const databaseFailure = await call('POST', '/api/v1/auth/register', {
      body: { email: `db-failure-${randomUUID()}@example.test` }, ip: '198.51.100.15',
    });
    assert.equal(databaseFailure.status, 500);
    const error = await databaseFailure.json();
    assert.equal(error.error.code, 'INTERNAL_ERROR');
    assert.equal(JSON.stringify(error).includes('campus_coin_missing_database_for_test'), false);
  });
}
