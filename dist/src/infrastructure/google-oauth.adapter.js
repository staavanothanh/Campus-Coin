import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { unauthorizedError } from '../lib/errors.js';
class GoogleOAuthAdapter {
    clientId;
    client;
    constructor(clientId, clientSecret, redirectUri) {
        this.clientId = clientId;
        this.client = new OAuth2Client(clientId, clientSecret, redirectUri);
    }
    generateAuthUrl(challenge) {
        return this.client.generateAuthUrl({
            access_type: 'online',
            prompt: 'consent',
            scope: ['openid', 'email', 'profile'],
            state: challenge.state,
            nonce: challenge.nonce,
            redirect_uri: challenge.redirectUri,
            code_challenge: challenge.codeChallenge,
            code_challenge_method: CodeChallengeMethod.S256
        });
    }
    async exchangeCode(code, codeVerifier, redirectUri, expectedNonce) {
        try {
            const { tokens } = await this.client.getToken({
                code,
                redirect_uri: redirectUri,
                codeVerifier
            });
            if (!tokens.id_token) {
                throw unauthorizedError('No id_token returned from Google');
            }
            const ticket = await this.client.verifyIdToken({
                idToken: tokens.id_token,
                audience: this.clientId,
            });
            const payload = ticket.getPayload();
            if (!payload) {
                throw unauthorizedError('Invalid id_token payload');
            }
            const issuer = payload.iss;
            if (issuer !== 'accounts.google.com' && issuer !== 'https://accounts.google.com') {
                throw unauthorizedError('Invalid issuer');
            }
            if (payload.nonce !== expectedNonce) {
                throw unauthorizedError('Invalid nonce');
            }
            if (!payload.email_verified) {
                throw unauthorizedError('Google email is not verified');
            }
            return {
                sub: payload.sub,
                email: payload.email,
                emailVerified: payload.email_verified,
                name: payload.name,
                picture: payload.picture
            };
        }
        catch (err) {
            if (err.name === 'AppError') {
                throw err;
            }
            throw unauthorizedError('Failed to exchange code or verify token');
        }
    }
}
export function createGoogleOAuthAdapter(config) {
    return new GoogleOAuthAdapter(config.google.clientId, config.google.clientSecret, config.google.callbackUrl);
}
//# sourceMappingURL=google-oauth.adapter.js.map