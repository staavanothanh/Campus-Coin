import { randomBytes, createHash, randomUUID, timingSafeEqual as _timingSafeEqual } from 'node:crypto';

export function generateSecureRandom(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function generateSessionId(): string {
  return generateSecureRandom(32);
}

export function generateCsrfToken(): string {
  return generateSecureRandom(32);
}

export function generateState(): string {
  return generateSecureRandom(32);
}

export function generateNonce(): string {
  return generateSecureRandom(32);
}

export function generateUUID(): string {
  return randomUUID();
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return _timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
