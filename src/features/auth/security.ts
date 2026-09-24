import { createHmac, randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const hash = await scrypt(password, salt, 64) as Buffer;
  return { hash: hash.toString('hex'), salt };
}

export async function checkPassword(password: string, hash: string, salt: string) {
  const candidate = await scrypt(password, salt, 64) as Buffer;
  const saved = Buffer.from(hash, 'hex');
  return candidate.length === saved.length && timingSafeEqual(candidate, saved);
}

export function newOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtp(email: string, purpose: string, code: string) {
  const secret = process.env.OTP_SECRET;
  if (!secret) throw new Error('OTP_SECRET chưa được cấu hình');
  return createHmac('sha256', secret).update(`${email}:${purpose}:${code}`).digest('hex');
}

export function equalHash(left: string, right: string) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function newSessionToken() {
  return randomBytes(32).toString('hex');
}

export function hashSession(token: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET chưa được cấu hình');
  return createHmac('sha256', secret).update(token).digest('hex');
}

export function csrfForSession(token: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET chưa được cấu hình');
  return createHmac('sha256', secret).update(`csrf:${token}`).digest('hex');
}

export function publicUser(user: { id: string | number; email: string; display_name: string; role: string; locale: string }) {
  return { id: String(user.id), email: user.email, displayName: user.display_name, role: user.role, locale: user.locale };
}
