export type UserRole = 'user' | 'admin' | 'security';
export type Locale = 'en' | 'vi';
export type UserStatus = 'active' | 'disabled';

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  locale: Locale;
  role: UserRole;
  status: UserStatus;
  timezone: string; // always 'Asia/Ho_Chi_Minh'
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthIdentity {
  id: string;
  userId: string;
  provider: 'google';
  subject: string;
  createdAt: Date;
}

export interface AppSession {
  hashedId: string;     // SHA-256 hash of raw session ID (stored in DB)
  userId: string;
  csrfToken: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  lastSeenAt: Date;
  userAgent: string | null;
}

export interface OAuthChallenge {
  state: string;
  nonce: string;
  codeVerifier: string;
  codeChallenge: string;
  redirectUri: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

// Express Request augmentation
declare global {
  namespace Express {
    interface Request {
      appSession?: AppSession;
      appUser?: AppUser;
    }
  }
}

export interface SessionRepository {
  create(session: AppSession): Promise<void>;
  findByHashedId(hashedId: string): Promise<AppSession | null>;
  updateLastSeen(hashedId: string, lastSeenAt: Date): Promise<void>;
  revoke(hashedId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}

export interface UserRepository {
  findById(id: string): Promise<AppUser | null>;
  findByGoogleSub(sub: string): Promise<AppUser | null>;
  upsertByGoogleSub(info: GoogleUserInfo): Promise<AppUser>;
  updatePreferences(userId: string, prefs: { displayName?: string; locale?: Locale }): Promise<AppUser>;
}

export interface GoogleOAuthPort {
  generateAuthUrl(challenge: OAuthChallenge): string;
  exchangeCode(code: string, codeVerifier: string, redirectUri: string, expectedNonce: string): Promise<GoogleUserInfo>;
}

export interface OAuthChallengeStore {
  save(challenge: OAuthChallenge): Promise<void>;
  consumeByState(state: string): Promise<OAuthChallenge | null>;
  deleteExpired(): Promise<void>;
}
