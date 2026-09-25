import { randomBytes, createHash, randomUUID, timingSafeEqual as _timingSafeEqual } from 'node:crypto';
export function generateSecureRandom(bytes) {
    return randomBytes(bytes).toString('hex');
}
export function sha256(input) {
    return createHash('sha256').update(input).digest('hex');
}
export function generatePKCE() {
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
}
export function generateSessionId() {
    return generateSecureRandom(32);
}
export function generateCsrfToken() {
    return generateSecureRandom(32);
}
export function generateState() {
    return generateSecureRandom(32);
}
export function generateNonce() {
    return generateSecureRandom(32);
}
export function generateUUID() {
    return randomUUID();
}
export function timingSafeEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    return _timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
//# sourceMappingURL=crypto.js.map