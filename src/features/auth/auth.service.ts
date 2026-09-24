import { randomUUID } from 'node:crypto';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getDb, type OtpRow, type UserRow } from '../../infrastructure/db.js';
import { sendOtp } from '../../infrastructure/mail.js';
import { checkPassword, csrfForSession, equalHash, hashOtp, hashPassword, hashSession, newOtp, newSessionToken, publicUser } from './security.js';

type Purpose = 'registration' | 'password_reset';

export class AppError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function emailValue(value: unknown) {
  if (typeof value !== 'string') throw new AppError(422, 'VALIDATION_ERROR', 'Email không hợp lệ');
  const email = value.trim().toLowerCase();
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Email không hợp lệ');
  }
  return email;
}

function passwordValue(value: unknown) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Mật khẩu cần từ 8 đến 128 ký tự');
  }
  return value;
}

async function findUser(email: string) {
  const [rows] = await getDb().execute<UserRow[]>(
    'SELECT id, email, display_name, locale, role, email_verified, status FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0];
}

async function latestOtp(db: PoolConnection, email: string, purpose: Purpose) {
  const [rows] = await db.execute<OtpRow[]>(
    'SELECT id, otp_hash, attempts, max_attempts, expires_at, created_at FROM email_otps WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1 FOR UPDATE',
    [email, purpose]
  );
  return rows[0];
}

async function issueOtp(email: string, purpose: Purpose) {
  const db = getDb();
  const [rows] = await db.execute<OtpRow[]>(
    'SELECT created_at FROM email_otps WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
    [email, purpose]
  );
  if (rows[0] && Date.now() - rows[0].created_at.getTime() < 60_000) {
    throw new AppError(429, 'RATE_LIMITED', 'Vui lòng chờ một phút trước khi yêu cầu mã mới');
  }

  const code = newOtp();
  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 300_000);
  await db.execute('DELETE FROM email_otps WHERE email = ? AND purpose = ?', [email, purpose]);
  await db.execute(
    'INSERT INTO email_otps (id, email, otp_hash, purpose, attempts, max_attempts, expires_at, created_at) VALUES (?, ?, ?, ?, 0, 5, ?, ?)',
    [id, email, hashOtp(email, purpose, code), purpose, expiresAt, now]
  );
  try {
    await sendOtp(email, code, purpose);
  } catch {
    await db.execute('DELETE FROM email_otps WHERE id = ?', [id]);
    throw new AppError(503, 'EMAIL_UNAVAILABLE', 'Chưa gửi được email, vui lòng thử lại sau');
  }
}

async function consumeOtp(db: PoolConnection, email: string, purpose: Purpose, code: unknown) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    throw new AppError(422, 'OTP_INVALID', 'Mã xác minh không hợp lệ');
  }
  const record = await latestOtp(db, email, purpose);
  if (!record || record.expires_at.getTime() < Date.now() || record.attempts >= record.max_attempts) {
    throw new AppError(422, 'OTP_INVALID', 'Mã đã hết hạn hoặc vượt số lần thử');
  }
  if (!equalHash(record.otp_hash, hashOtp(email, purpose, code))) {
    await db.execute('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?', [record.id]);
    return false;
  }
  await db.execute('DELETE FROM email_otps WHERE email = ? AND purpose = ?', [email, purpose]);
  return true;
}

export async function register(input: Record<string, unknown>) {
  const email = emailValue(input.email);
  if (await findUser(email)) throw new AppError(409, 'CONFLICT', 'Email đã được đăng ký');
  await issueOtp(email, 'registration');
  return { message: 'Đã gửi mã xác minh đến email' };
}

export async function verifyRegistration(input: Record<string, unknown>) {
  const email = emailValue(input.email);
  const password = passwordValue(input.password);
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  if (fullName.length < 2 || fullName.length > 120) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Tên cần từ 2 đến 120 ký tự');
  }
  if (await findUser(email)) throw new AppError(409, 'CONFLICT', 'Email đã được đăng ký');

  const passwordData = await hashPassword(password);
  const db = await getDb().getConnection();
  let valid = false;
  try {
    await db.beginTransaction();
    valid = await consumeOtp(db, email, 'registration', input.otp);
    if (valid) {
      const [result] = await db.execute<ResultSetHeader>(
        'INSERT INTO users (display_name, email, email_verified, status, locale, timezone, role) VALUES (?, ?, 1, ?, ?, ?, ?)',
        [fullName, email, 'active', input.locale === 'en' ? 'en' : 'vi', 'Asia/Ho_Chi_Minh', 'user']
      );
      await db.execute(
        'INSERT INTO auth_credentials (user_id, password_hash, password_salt) VALUES (?, ?, ?)',
        [result.insertId, passwordData.hash, passwordData.salt]
      );
    }
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
  if (!valid) throw new AppError(422, 'OTP_INVALID', 'Mã xác minh không đúng');
  return { message: 'Xác minh thành công, bạn có thể đăng nhập' };
}

export async function resendOtp(input: Record<string, unknown>) {
  const email = emailValue(input.email);
  if (input.purpose !== 'registration' && input.purpose !== 'password_reset') {
    throw new AppError(422, 'VALIDATION_ERROR', 'Loại mã xác minh không hợp lệ');
  }
  if (input.purpose === 'password_reset') return forgotPassword({ email });
  if (await findUser(email)) throw new AppError(409, 'CONFLICT', 'Email đã được đăng ký');
  await issueOtp(email, 'registration');
  return { message: 'Đã gửi lại mã xác minh' };
}

export async function login(input: Record<string, unknown>) {
  const email = emailValue(input.email);
  const password = typeof input.password === 'string' ? input.password : '';
  const user = await findUser(email);
  const failure = new AppError(401, 'UNAUTHORIZED', 'Email hoặc mật khẩu không đúng');
  if (!user) throw failure;
  const [rows] = await getDb().execute<(RowDataPacket & { password_hash: string; password_salt: string })[]>(
    'SELECT password_hash, password_salt FROM auth_credentials WHERE user_id = ? LIMIT 1',
    [user.id]
  );
  if (!rows[0] || !await checkPassword(password, rows[0].password_hash, rows[0].password_salt)) throw failure;
  if (user.status !== 'active') throw new AppError(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị khóa');
  if (!user.email_verified) throw new AppError(403, 'UNVERIFIED_EMAIL', 'Bạn cần xác minh email trước');

  const token = newSessionToken();
  const csrfToken = csrfForSession(token);
  await getDb().execute(
    'INSERT INTO sessions (user_id, token_hash, csrf_token_hash, expires_at) VALUES (?, ?, SHA2(?, 256), ?)',
    [user.id, hashSession(token), csrfToken, new Date(Date.now() + 86_400_000)]
  );
  return { token, csrfToken, user: publicUser(user) };
}

export async function forgotPassword(input: Record<string, unknown>) {
  const email = emailValue(input.email);
  const user = await findUser(email);
  if (user && user.email_verified && user.status === 'active') {
    try {
      await issueOtp(email, 'password_reset');
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      if (error.code !== 'RATE_LIMITED' && error.code !== 'EMAIL_UNAVAILABLE') throw error;
    }
  }
  return { message: 'Nếu email đã đăng ký, bạn sẽ nhận được mã xác minh' };
}

export async function resetPassword(input: Record<string, unknown>) {
  const email = emailValue(input.email);
  const password = passwordValue(input.newPassword);
  const user = await findUser(email);
  if (!user || user.status !== 'active') throw new AppError(422, 'OTP_INVALID', 'Mã xác minh không hợp lệ');
  const passwordData = await hashPassword(password);
  const db = await getDb().getConnection();
  let valid = false;
  try {
    await db.beginTransaction();
    valid = await consumeOtp(db, email, 'password_reset', input.otp);
    if (valid) {
      await db.execute(
        'UPDATE auth_credentials SET password_hash = ?, password_salt = ? WHERE user_id = ?',
        [passwordData.hash, passwordData.salt, user.id]
      );
      await db.execute('UPDATE sessions SET revoked_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL', [user.id]);
    }
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
  if (!valid) throw new AppError(422, 'OTP_INVALID', 'Mã xác minh không đúng');
  return { message: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại' };
}

export async function getSession(token: string) {
  const [rows] = await getDb().execute<UserRow[]>(
    'SELECT u.id, u.email, u.display_name, u.locale, u.role, u.email_verified, u.status FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP(3) AND u.email_verified = 1 AND u.status = ? LIMIT 1',
    [hashSession(token), 'active']
  );
  return rows[0] ? publicUser(rows[0]) : null;
}

export async function getCsrf(token: string) {
  const user = await getSession(token);
  return user ? csrfForSession(token) : undefined;
}

export async function logout(token: string) {
  await getDb().execute('UPDATE sessions SET revoked_at = UTC_TIMESTAMP(3) WHERE token_hash = ?', [hashSession(token)]);
}
