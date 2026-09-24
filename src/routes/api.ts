import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { getDb, type UserRow } from '../infrastructure/db.js';
import type { RowDataPacket } from 'mysql2/promise';
import { publicUser } from '../features/auth/security.js';
import { AppError, forgotPassword, getCsrf, getSession, login, logout, register, resendOtp, resetPassword, verifyRegistration } from '../features/auth/auth.service.js';

function send(res: ServerResponse, status: number, body: unknown, cookie?: string) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...(cookie ? { 'Set-Cookie': cookie } : {}) });
  res.end(JSON.stringify(body));
}

function readCookie(req: IncomingMessage) {
  const part = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith('cc_session='));
  return part?.slice('cc_session='.length) || '';
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const data = Buffer.from(chunk);
    size += data.length;
    if (size > 64_000) throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu gửi lên quá lớn');
    chunks.push(data);
  }
  try {
    if (!chunks.length) return {};
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new AppError(400, 'BAD_REQUEST', 'Dữ liệu JSON không hợp lệ');
  }
}

function cookie(token: string, clear = false) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `cc_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : 86400}${secure}`;
}

function checkOrigin(req: IncomingMessage) {
  const allowed = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173';
  if (req.headers.origin !== allowed) throw new AppError(403, 'ORIGIN_INVALID', 'Nguồn yêu cầu không hợp lệ');
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  const method = req.method || 'GET';

  try {
    if (method === 'GET' && path === '/api/v1/health') {
      return send(res, 200, { data: { status: 'pass', timestamp: new Date().toISOString() } });
    }
    if (method === 'GET' && path === '/api/v1/health/ready') {
      await getDb().query('SELECT 1');
      return send(res, 200, { data: { status: 'pass', checks: { database: 'pass' } } });
    }

    const token = readCookie(req);
    const publicPaths = [
      '/api/v1/auth/register', '/api/v1/auth/verify-registration', '/api/v1/auth/resend-otp',
      '/api/v1/auth/login', '/api/v1/auth/forgot-password', '/api/v1/auth/reset-password'
    ];

    if (method === 'POST') {
      checkOrigin(req);
      if (!publicPaths.includes(path)) {
        const csrf = token ? await getCsrf(token) : undefined;
        if (!csrf || req.headers['x-csrf-token'] !== csrf) {
          throw new AppError(403, 'CSRF_INVALID', 'Thiếu mã bảo vệ phiên');
        }
      }
      const body = await readBody(req);
      if (path === '/api/v1/auth/register') return send(res, 201, { data: await register(body) });
      if (path === '/api/v1/auth/verify-registration') return send(res, 200, { data: await verifyRegistration(body) });
      if (path === '/api/v1/auth/resend-otp') return send(res, 200, { data: await resendOtp(body) });
      if (path === '/api/v1/auth/forgot-password') return send(res, 200, { data: await forgotPassword(body) });
      if (path === '/api/v1/auth/reset-password') return send(res, 200, { data: await resetPassword(body) });
      if (path === '/api/v1/auth/login') {
        const result = await login(body);
        return send(res, 200, { data: { user: result.user, csrfToken: result.csrfToken } }, cookie(result.token));
      }
      if (path === '/api/v1/auth/logout') {
        if (token) await logout(token);
        return send(res, 200, { data: { message: 'Đã đăng xuất' } }, cookie('', true));
      }
    }

    if (method === 'GET' && path === '/api/v1/auth/session') {
      const user = token ? await getSession(token) : null;
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập');
      return send(res, 200, { data: { user, csrfToken: await getCsrf(token) } });
    }

    if (method === 'GET' && path === '/api/v1/auth/csrf') {
      const csrfToken = token ? await getCsrf(token) : undefined;
      if (!csrfToken) throw new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập');
      return send(res, 200, { data: { csrfToken } });
    }

    if (method === 'GET' && path === '/api/v1/users/me') {
      const user = token ? await getSession(token) : null;
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập');
      return send(res, 200, { data: user });
    }

    const userMatch = path.match(/^\/api\/v1\/users\/([^/]+)$/);
    if (method === 'GET' && userMatch) {
      const user = token ? await getSession(token) : null;
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập');
      if (!/^\d+$/.test(userMatch[1])) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản');
      if (user.id !== userMatch[1]) throw new AppError(403, 'FORBIDDEN', 'Không có quyền xem tài khoản này');
      const [rows] = await getDb().execute<UserRow[]>(
        'SELECT id, email, display_name, locale, role, email_verified, status FROM users WHERE id = ? LIMIT 1', [userMatch[1]]
      );
      if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản');
      return send(res, 200, { data: publicUser(rows[0]) });
    }

    if (method === 'GET' && path === '/api/v1/admin/stats') {
      const user = token ? await getSession(token) : null;
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập');
      if (user.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Không có quyền quản trị');
      const [rows] = await getDb().query<(RowDataPacket & { total: number; verified: number })[]>(
        'SELECT COUNT(*) AS total, COALESCE(SUM(email_verified), 0) AS verified FROM users'
      );
      return send(res, 200, { data: { totalUsers: rows[0].total, verifiedUsers: rows[0].verified } });
    }

    return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn' } });
  } catch (error) {
    if (error instanceof AppError) return send(res, error.status, { error: { code: error.code, message: error.message } });
    // Không trả lỗi cơ sở dữ liệu hoặc SMTP ra trình duyệt.
    return send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Hệ thống đang bận, vui lòng thử lại' } });
  }
}

export function createApiServer() {
  return createServer(handleRequest);
}
