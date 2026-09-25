import type { GoogleOAuthPort, OAuthChallengeStore, SessionRepository, UserRepository, AppSession, AppUser, Locale } from '../types/index.js';
import type { AppConfig } from '../app/config.js';
export interface AuthService {
    startOAuth(redirectUri: string): Promise<{
        authUrl: string;
    }>;
    handleCallback(code: string, state: string, userAgent: string | null): Promise<{
        rawSessionId: string;
        redirectTo: string;
    }>;
    getSession(rawSessionId: string): Promise<{
        session: AppSession;
        user: AppUser;
    } | null>;
    logout(rawSessionId: string): Promise<void>;
    updatePreferences(userId: string, prefs: {
        displayName?: string;
        locale?: Locale;
    }): Promise<AppUser>;
}
export declare function createAuthService(deps: {
    googleOAuth: GoogleOAuthPort;
    challengeStore: OAuthChallengeStore;
    sessionRepo: SessionRepository;
    userRepo: UserRepository;
    config: AppConfig;
}): AuthService;
