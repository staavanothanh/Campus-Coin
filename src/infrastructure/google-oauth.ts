import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';

const FLOW_TTL_MS = 10 * 60 * 1000;
const GOOGLE_CALLBACK_PATH = '/api/v1/auth/google/callback';

export type GoogleOAuthMode = 'login' | 'link';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  sessionSecret: string;
  secureCookie: boolean;
}

export interface GoogleIdentity {
  subject: string;
  email: string;
  displayName: string;
}

export interface GoogleOAuthContext {
  mode: GoogleOAuthMode;
  userId?: string;
  identity: GoogleIdentity;
}

export interface GoogleOAuthClient {
  createAuthorizationUrl(state: string, nonce: string): Promise<{
    url: string;
    codeVerifier: string;
  }>;
  verifyCode(code: string, codeVerifier: string, nonce: string): Promise<GoogleIdentity>;
}

export interface GoogleOAuthProvider {
  readonly enabled: boolean;
  readonly cookieName: string;
  start(mode: GoogleOAuthMode, userId?: string): Promise<{ url: string; cookie: string }>;
  complete(search: URLSearchParams, cookieValue: string): Promise<GoogleOAuthContext>;
  clearCookie(): string;
}

interface GoogleFlowState {
  state: string;
  nonce: string;
  codeVerifier: string;
  mode: GoogleOAuthMode;
  userId?: string;
  createdAt: number;
}

export class GoogleOAuthError extends Error {
  code: 'GOOGLE_CANCELLED' | 'GOOGLE_FLOW_INVALID' | 'GOOGLE_PROVIDER_ERROR';

  constructor(code: 'GOOGLE_CANCELLED' | 'GOOGLE_FLOW_INVALID' | 'GOOGLE_PROVIDER_ERROR') {
    super(code);
    this.name = 'GoogleOAuthError';
    this.code = code;
  }
}

export function readGoogleOAuthConfig(env: NodeJS.ProcessEnv = process.env): GoogleOAuthConfig | null {
  const names = [
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'GOOGLE_OAUTH_REDIRECT_URI',
  ] as const;
  const values = names.map(name => env[name]?.trim() || '');
  if (values.every(value => value === '')) return null;
  if (values.some(value => value === '')) throw new Error('Google OAuth configuration is incomplete');

  const [clientId, clientSecret, redirectUri] = values;
  if (!clientId || !clientSecret || !redirectUri) throw new Error('Google OAuth configuration is incomplete');

  let redirect: URL;
  try {
    redirect = new URL(redirectUri);
  } catch {
    throw new Error('Google OAuth redirect URI is invalid');
  }
  const isLocal = redirect.hostname === 'localhost' || redirect.hostname === '127.0.0.1';
  if (
    (redirect.protocol !== 'https:' && !(redirect.protocol === 'http:' && isLocal))
    || redirect.pathname !== GOOGLE_CALLBACK_PATH
    || redirect.username !== ''
    || redirect.password !== ''
    || redirect.search !== ''
    || redirect.hash !== ''
  ) {
    throw new Error('Google OAuth redirect URI is invalid');
  }

  const sessionSecret = env.SESSION_SECRET || '';
  if (Buffer.byteLength(sessionSecret, 'utf8') < 32) {
    throw new Error('SESSION_SECRET must be configured before Google OAuth');
  }

  return {
    clientId,
    clientSecret,
    redirectUri: redirect.toString(),
    sessionSecret,
    secureCookie: env.NODE_ENV === 'production',
  };
}

function safeEqual(first: string, second: string): boolean {
  const firstBytes = Buffer.from(first);
  const secondBytes = Buffer.from(second);
  return firstBytes.length === secondBytes.length && timingSafeEqual(firstBytes, secondBytes);
}

function signFlow(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update('campus-coin-google-oauth-v1:')
    .update(payload)
    .digest('base64url');
}

function createGoogleOAuthClient(config: GoogleOAuthConfig): GoogleOAuthClient {
  const client = new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
  });

  return {
    async createAuthorizationUrl(state, nonce) {
      const verifier = await client.generateCodeVerifierAsync();
      if (!verifier.codeChallenge) throw new GoogleOAuthError('GOOGLE_PROVIDER_ERROR');
      const url = client.generateAuthUrl({
        scope: ['openid', 'email', 'profile'],
        state,
        nonce,
        code_challenge: verifier.codeChallenge,
        code_challenge_method: CodeChallengeMethod.S256,
        prompt: 'select_account',
      });
      return { url, codeVerifier: verifier.codeVerifier };
    },

    async verifyCode(code, codeVerifier, nonce) {
      try {
        const { tokens } = await client.getToken({ code, codeVerifier });
        if (!tokens.id_token) throw new GoogleOAuthError('GOOGLE_PROVIDER_ERROR');
        const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
        const payload = ticket.getPayload();
        const email = payload?.email?.trim().toLowerCase() || '';
        const displayName = payload?.name?.trim() || email.split('@')[0] || 'Campus Coin user';
        if (
          !payload
          || payload.nonce !== nonce
          || !payload.sub
          || payload.sub.length > 255
          || payload.email_verified !== true
          || email.length > 255
          || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
          || displayName.length > 120
        ) {
          throw new GoogleOAuthError('GOOGLE_PROVIDER_ERROR');
        }
        return {
          subject: payload.sub,
          email,
          displayName,
        };
      } catch {
        throw new GoogleOAuthError('GOOGLE_PROVIDER_ERROR');
      }
    },
  };
}

function flowCookie(name: string, value: string, config: GoogleOAuthConfig, maxAge: number): string {
  const secure = config.secureCookie ? '; Secure' : '';
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function disabledProvider(): GoogleOAuthProvider {
  return {
    enabled: false,
    cookieName: 'cc_google_flow',
    async start() { throw new GoogleOAuthError('GOOGLE_PROVIDER_ERROR'); },
    async complete() { throw new GoogleOAuthError('GOOGLE_FLOW_INVALID'); },
    clearCookie() { return 'cc_google_flow=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'; },
  };
}

function isGoogleFlowState(value: unknown): value is GoogleFlowState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const flow = value as Record<string, unknown>;
  if (
    typeof flow.state !== 'string'
    || typeof flow.nonce !== 'string'
    || typeof flow.codeVerifier !== 'string'
    || typeof flow.createdAt !== 'number'
    || (flow.mode !== 'login' && flow.mode !== 'link')
  ) {
    return false;
  }
  if (flow.mode === 'link') return typeof flow.userId === 'string' && flow.userId.length > 0;
  return flow.userId === undefined;
}

export function createGoogleOAuthProvider(
  config: GoogleOAuthConfig | null = readGoogleOAuthConfig(),
  oauthClient?: GoogleOAuthClient,
): GoogleOAuthProvider {
  if (!config) return disabledProvider();

  const client = oauthClient ?? createGoogleOAuthClient(config);
  const cookieName = config.secureCookie ? '__Host-cc_google_flow' : 'cc_google_flow';

  return {
    enabled: true,
    cookieName,
    async start(mode, userId) {
      if (mode === 'link' && !userId) throw new GoogleOAuthError('GOOGLE_FLOW_INVALID');
      const state = randomBytes(32).toString('base64url');
      const nonce = randomBytes(32).toString('base64url');
      const { url, codeVerifier } = await client.createAuthorizationUrl(state, nonce);
      const flow: GoogleFlowState = {
        state,
        nonce,
        codeVerifier,
        mode,
        ...(userId ? { userId } : {}),
        createdAt: Date.now(),
      };
      const payload = Buffer.from(JSON.stringify(flow)).toString('base64url');
      const cookieValue = `${payload}.${signFlow(payload, config.sessionSecret)}`;
      return { url, cookie: flowCookie(cookieName, cookieValue, config, FLOW_TTL_MS / 1000) };
    },
    async complete(search, cookieValue) {
      if (cookieValue.length > 4096) throw new GoogleOAuthError('GOOGLE_FLOW_INVALID');
      const parts = cookieValue.split('.');
      const payload = parts[0];
      const signature = parts[1];
      if (parts.length !== 2) throw new GoogleOAuthError('GOOGLE_FLOW_INVALID');
      if (!payload || !signature || !safeEqual(signature, signFlow(payload, config.sessionSecret))) {
        throw new GoogleOAuthError('GOOGLE_FLOW_INVALID');
      }

      let flow: unknown;
      try {
        flow = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as unknown;
      } catch {
        throw new GoogleOAuthError('GOOGLE_FLOW_INVALID');
      }

      if (!isGoogleFlowState(flow)) throw new GoogleOAuthError('GOOGLE_FLOW_INVALID');

      const age = Date.now() - flow.createdAt;
      if (
        age < 0
        || age > FLOW_TTL_MS
        || !safeEqual(flow.state, search.get('state') || '')
      ) {
        throw new GoogleOAuthError('GOOGLE_FLOW_INVALID');
      }
      if (search.has('error')) throw new GoogleOAuthError('GOOGLE_CANCELLED');

      const code = search.get('code') || '';
      if (!code || code.length > 2048) throw new GoogleOAuthError('GOOGLE_FLOW_INVALID');
      const identity = await client.verifyCode(code, flow.codeVerifier, flow.nonce);
      return {
        mode: flow.mode,
        ...(flow.userId ? { userId: flow.userId } : {}),
        identity,
      };
    },
    clearCookie() {
      return flowCookie(cookieName, '', config, 0);
    },
  };
}
