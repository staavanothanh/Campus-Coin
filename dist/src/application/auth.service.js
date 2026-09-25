import { generateState, generateNonce, generatePKCE, generateSessionId, sha256, generateCsrfToken } from '../lib/crypto.js';
import { unauthorizedError, accountDisabledError } from '../lib/errors.js';
class AuthServiceImpl {
    googleOAuth;
    challengeStore;
    sessionRepo;
    userRepo;
    config;
    constructor(googleOAuth, challengeStore, sessionRepo, userRepo, config) {
        this.googleOAuth = googleOAuth;
        this.challengeStore = challengeStore;
        this.sessionRepo = sessionRepo;
        this.userRepo = userRepo;
        this.config = config;
    }
    async startOAuth(redirectUri) {
        const state = generateState();
        const nonce = generateNonce();
        const pkce = generatePKCE();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // TTL 10 minutes
        const challenge = {
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
    async handleCallback(code, state, userAgent) {
        const challenge = await this.challengeStore.consumeByState(state);
        if (!challenge) {
            throw unauthorizedError('Invalid or expired OAuth state');
        }
        if (new Date() > challenge.expiresAt) {
            throw unauthorizedError('OAuth challenge expired');
        }
        const userInfo = await this.googleOAuth.exchangeCode(code, challenge.codeVerifier, challenge.redirectUri, challenge.nonce);
        const user = await this.userRepo.upsertByGoogleSub(userInfo);
        if (user.status === 'disabled') {
            throw accountDisabledError();
        }
        const rawSessionId = generateSessionId();
        const hashedId = sha256(rawSessionId);
        const csrfToken = generateCsrfToken();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.config.session.maxAgeMs);
        const session = {
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
    async getSession(rawSessionId) {
        const hashedId = sha256(rawSessionId);
        const session = await this.sessionRepo.findByHashedId(hashedId);
        if (!session)
            return null;
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
    async logout(rawSessionId) {
        const hashedId = sha256(rawSessionId);
        await this.sessionRepo.revoke(hashedId);
    }
    async updatePreferences(userId, prefs) {
        return this.userRepo.updatePreferences(userId, prefs);
    }
}
export function createAuthService(deps) {
    return new AuthServiceImpl(deps.googleOAuth, deps.challengeStore, deps.sessionRepo, deps.userRepo, deps.config);
}
//# sourceMappingURL=auth.service.js.map