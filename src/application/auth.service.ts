import type { GoogleOAuthPort, OAuthChallengeStore, SessionRepository, UserRepository, AppSession, AppUser, Locale, OAuthChallenge } from '../types/index.js';
import type { AppConfig } from '../app/config.js';
import { generateState, generateNonce, generatePKCE, generateSessionId, sha256, generateCsrfToken } from '../lib/crypto.js';
import { unauthorizedError, accountDisabledError } from '../lib/errors.js';

export interface AuthService {
  startOAuth(redirectUri: string): Promise<{ authUrl: string }>;
  handleCallback(code: string, state: string, userAgent: string | null): Promise<{ rawSessionId: string; redirectTo: string }>;
  getSession(rawSessionId: string): Promise<{ session: AppSession; user: AppUser } | null>;
  logout(rawSessionId: string): Promise<void>;
  updatePreferences(userId: string, prefs: { displayName?: string; locale?: Locale }): Promise<AppUser>;
}

class AuthServiceImpl implements AuthService {
  constructor(
    private googleOAuth: GoogleOAuthPort,
    private challengeStore: OAuthChallengeStore,
    private sessionRepo: SessionRepository,
    private userRepo: UserRepository,
    private config: AppConfig
  ) {}

  async startOAuth(redirectUri: string): Promise<{ authUrl: string }> {
    const state = generateState();
    const nonce = generateNonce();
    const pkce = generatePKCE();
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // TTL 10 minutes
    
    const challenge: OAuthChallenge = {
      state,
      nonce,
      codeVerifier: pkce.codeVerifier,
      codeChallenge: pkce.codeChallenge,
      redirectUri,
      createdAt: now,
      expiresAt
    };
    
    await this.challengeStore.save(challenge);
    
    const authUrl = this.googleOAuth.generateAuthUrl(challenge);
    return { authUrl };
  }

  async handleCallback(code: string, state: string, userAgent: string | null): Promise<{ rawSessionId: string; redirectTo: string }> {
    const challenge = await this.challengeStore.consumeByState(state);
    if (!challenge) {
      throw unauthorizedError('Invalid or expired OAuth state');
    }
    
    if (new Date() > challenge.expiresAt) {
      throw unauthorizedError('OAuth challenge expired');
    }
    
    const userInfo = await this.googleOAuth.exchangeCode(
      code,
      challenge.codeVerifier,
      challenge.redirectUri,
      challenge.nonce
    );
    
    const user = await this.userRepo.upsertByGoogleSub(userInfo);
    
    if (user.status === 'disabled') {
      throw accountDisabledError();
    }
    
    const rawSessionId = generateSessionId();
    const hashedId = sha256(rawSessionId);
    const csrfToken = generateCsrfToken();
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.session.maxAgeMs);
    
    const session: AppSession = {
      hashedId,
      userId: user.id,
      csrfToken,
      issuedAt: now,
      expiresAt,
      revokedAt: null,
      lastSeenAt: now,
      userAgent
    };
    
    await this.sessionRepo.create(session);
    
    return { rawSessionId, redirectTo: '/' };
  }

  async getSession(rawSessionId: string): Promise<{ session: AppSession; user: AppUser } | null> {
    const hashedId = sha256(rawSessionId);
    
    const session = await this.sessionRepo.findByHashedId(hashedId);
    if (!session) return null;
    
    const user = await this.userRepo.findById(session.userId);
    if (!user || user.status === 'disabled') {
      await this.sessionRepo.revoke(hashedId);
      return null;
    }
    
    const now = new Date();
    await this.sessionRepo.updateLastSeen(hashedId, now);
    session.lastSeenAt = now;
    
    return { session, user };
  }

  async logout(rawSessionId: string): Promise<void> {
    const hashedId = sha256(rawSessionId);
    await this.sessionRepo.revoke(hashedId);
  }

  async updatePreferences(userId: string, prefs: { displayName?: string; locale?: Locale }): Promise<AppUser> {
    return this.userRepo.updatePreferences(userId, prefs);
  }
}

export function createAuthService(deps: {
  googleOAuth: GoogleOAuthPort;
  challengeStore: OAuthChallengeStore;
  sessionRepo: SessionRepository;
  userRepo: UserRepository;
  config: AppConfig;
}): AuthService {
  return new AuthServiceImpl(
    deps.googleOAuth,
    deps.challengeStore,
    deps.sessionRepo,
    deps.userRepo,
    deps.config
  );
}
