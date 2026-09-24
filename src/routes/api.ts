import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { isIP } from 'node:net';
import { createUserIssue, getAdminIssue, listAdminIssues, listUserIssues, updateAdminIssue, addAdminIssueNote } from '../application/issue.service.ts';
import { listAdminAuditLogs } from '../application/admin.service.ts';
import { getPool } from '../infrastructure/db/pool.ts';
import { assertSchemaReady } from '../infrastructure/db/readiness.js';
import { getAdminStats } from '../application/admin.service.ts';
import { updateUserPreferences } from '../application/user.service.ts';
import { sendOtp, type OtpSender } from '../infrastructure/mail.js';
import { DomainError } from '../domain/errors.js';
import { canonicalHash } from '../lib/hash.js';
import { AppError, forgotPassword, getCsrf, getSession, hasGoogleIdentity, linkGoogleIdentity, login, loginWithGoogle, logout, register, resendOtp, resetPassword, verifyRegistration } from '../features/auth/auth.service.js';
import { handleDomainRequest } from './domain.ts';
import { createGoogleOAuthProvider, GoogleOAuthError, type GoogleOAuthProvider } from '../infrastructure/google-oauth.ts';

type GoogleAuthErrorCode =
  | 'cancelled'
  | 'invalid_flow'
  | 'provider_error'
  | 'provider_unavailable'
  | 'link_required'
  | 'account_conflict'
  | 'login_required'
  | 'rate_limited'
  | 'failed';
type GoogleAuthResult = 'google_login' | 'google_linked' | GoogleAuthErrorCode;

function send(res: ServerResponse, status: number, body: unknown, cookie?: string, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...(cookie ? { 'Set-Cookie': cookie } : {}), ...headers });
  res.end(JSON.stringify(body));
}

function readCookie(req: IncomingMessage) {
  return readNamedCookie(req, 'cc_session');
}

function readNamedCookie(req: IncomingMessage, name: string) {
  const prefix = `${name}=`;
  const part = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith(prefix));
  return part?.slice(prefix.length) || '';
}

function redirect(res: ServerResponse, location: string, cookies: string[] = []) {
  res.writeHead(302, {
    Location: location,
    'Cache-Control': 'no-store',
    ...(cookies.length ? { 'Set-Cookie': cookies } : {}),
  });
  res.end();
}

function appLocation(result: GoogleAuthResult, isError = false) {
  const origin = new URL(process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173');
  if (
    !['http:', 'https:'].includes(origin.protocol)
    || origin.username !== ''
    || origin.password !== ''
    || origin.pathname !== '/'
    || origin.search !== ''
    || origin.hash !== ''
  ) {
    throw new Error('CLIENT_ORIGIN must be a valid origin');
  }
  const page = new URL('/', origin.origin);
  page.searchParams.set(isError ? 'auth_error' : 'auth', result);
  return page.toString();
}

function googleErrorKey(error: unknown): GoogleAuthErrorCode {
  if (error instanceof GoogleOAuthError) {
    if (error.code === 'GOOGLE_CANCELLED') return 'cancelled';
    if (error.code === 'GOOGLE_FLOW_INVALID') return 'invalid_flow';
    return 'provider_error';
  }
  if (error instanceof AppError) {
    if (error.code === 'GOOGLE_ACCOUNT_LINK_REQUIRED') return 'link_required';
    if (error.code === 'GOOGLE_ACCOUNT_CONFLICT') return 'account_conflict';
    if (error.code === 'UNAUTHORIZED') return 'login_required';
    if (error.code === 'RATE_LIMITED') return 'rate_limited';
  }
  return 'failed';
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

function clientIp(req: IncomingMessage) {
  const socketIp = req.socket.remoteAddress || 'unknown';
  if (process.env.TRUST_PROXY !== 'true') return socketIp;
  const forwarded = req.headers['x-forwarded-for'];
  const firstAddress = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim();
  return firstAddress && isIP(firstAddress) ? firstAddress : socketIp;
}

function requiredString(value: unknown, name: string, maxLength: number) {
  if (typeof value !== 'string' || value.trim().length < 1 || value.length > maxLength) {
    throw new AppError(422, 'VALIDATION_ERROR', `${name} không hợp lệ`);
  }
  return value;
}

function issuePageQuery(search: URLSearchParams) {
  const rawLimit = search.get('limit');
  const limit = rawLimit === null ? 20 : Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(422, 'VALIDATION_ERROR', 'limit không hợp lệ');
  }
  const cursor = search.get('cursor') ?? undefined;
  if (cursor !== undefined && cursor.length > 512) throw new AppError(422, 'VALIDATION_ERROR', 'cursor không hợp lệ');
  return cursor === undefined ? { limit } : { limit, cursor };
}

function requireAdmin(user: { role: string }) {
  if (user.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Không có quyền quản trị');
}

function idempotencyKey(req: IncomingMessage) {
  const value = req.headers['idempotency-key'];
  if (typeof value !== 'string' || value.length < 1 || value.length > 128) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Thiếu hoặc sai Idempotency-Key');
  }
  return value;
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  emailSender: OtpSender = sendOtp,
  googleOAuth: GoogleOAuthProvider = createGoogleOAuthProvider(),
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  const method = req.method || 'GET';

  try {
    if (method === 'GET' && path === '/api/v1/health') {
      return send(res, 200, { data: { status: 'pass', timestamp: new Date().toISOString() } });
    }
    if (method === 'GET' && path === '/api/v1/health/ready') {
      try {
        await assertSchemaReady();
      } catch {
        throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database schema chưa sẵn sàng');
      }
      return send(res, 200, { data: { status: 'pass', checks: { database: 'pass', schema: 'pass' } } });
    }

    if (method === 'GET' && path === '/api/v1/auth/providers') {
      return send(res, 200, { data: { google: googleOAuth.enabled } });
    }

    if (method === 'GET' && path === '/api/v1/auth/google/start') {
      if (!googleOAuth.enabled) return redirect(res, appLocation('provider_unavailable', true));
      const started = await googleOAuth.start('login');
      return redirect(res, started.url, [started.cookie]);
    }

    const token = readCookie(req);
    const publicPaths = [
      '/api/v1/auth/register', '/api/v1/auth/verify-registration', '/api/v1/auth/resend-otp',
      '/api/v1/auth/login', '/api/v1/auth/forgot-password', '/api/v1/auth/reset-password'
    ];

    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    let mutationUser: Awaited<ReturnType<typeof getSession>> = null;
    if (isMutation) {
      checkOrigin(req);
      const isPublicAuthPost = method === 'POST' && publicPaths.includes(path);
      const isLogout = method === 'POST' && path === '/api/v1/auth/logout';
      if (!isPublicAuthPost && !isLogout) {
        mutationUser = token ? await getSession(token) : null;
        if (!mutationUser) throw new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập');
        const csrf = token ? await getCsrf(token) : undefined;
        if (!csrf || req.headers['x-csrf-token'] !== csrf) {
          throw new AppError(403, 'CSRF_INVALID', 'Thiếu mã bảo vệ phiên');
        }
      } else if (isLogout) {
        mutationUser = token ? await getSession(token) : null;
        if (mutationUser) {
          const csrf = token ? await getCsrf(token) : undefined;
          if (!csrf || req.headers['x-csrf-token'] !== csrf) {
            throw new AppError(403, 'CSRF_INVALID', 'Thiếu mã bảo vệ phiên');
          }
        }
      }
      const body = method === 'DELETE' ? {} : await readBody(req);
      if (method === 'POST') {
        const ip = clientIp(req);
        if (path === '/api/v1/auth/google/link' && mutationUser) {
          if (!googleOAuth.enabled) throw new AppError(503, 'GOOGLE_UNAVAILABLE', 'Đăng nhập Google chưa được cấu hình');
          const started = await googleOAuth.start('link', mutationUser.id);
          return send(res, 200, { data: { url: started.url } }, started.cookie);
        }
        if (path === '/api/v1/auth/register') return send(res, 201, { data: await register(body, ip, emailSender) });
        if (path === '/api/v1/auth/verify-registration') return send(res, 200, { data: await verifyRegistration(body, ip) });
        if (path === '/api/v1/auth/resend-otp') return send(res, 200, { data: await resendOtp(body, ip, emailSender) });
        if (path === '/api/v1/auth/forgot-password') return send(res, 200, { data: await forgotPassword(body, ip, emailSender) });
        if (path === '/api/v1/auth/reset-password') return send(res, 200, { data: await resetPassword(body, ip) });
        if (path === '/api/v1/auth/login') {
          const result = await login(body, ip);
          return send(res, 200, {
            data: { user: result.user, csrfToken: result.csrfToken, googleLinked: await hasGoogleIdentity(result.user.id) },
          }, cookie(result.token));
        }
        if (path === '/api/v1/auth/logout') {
          if (token) await logout(token);
          return send(res, 200, { data: { message: 'Đã đăng xuất' } }, cookie('', true));
        }
      }
      if (method === 'PATCH' && path === '/api/v1/users/me/preferences' && mutationUser) {
        const userId = Number(mutationUser.id);
        return send(res, 200, { data: await updateUserPreferences(userId, body) });
      }
      if (method === 'POST' && path === '/api/v1/issues' && mutationUser) {
        const relatedTransactionId = body.relatedTransactionId === undefined
          ? null
          : Number(body.relatedTransactionId);
        if (relatedTransactionId !== null && (!Number.isSafeInteger(relatedTransactionId) || relatedTransactionId < 1)) {
          throw new AppError(422, 'VALIDATION_ERROR', 'relatedTransactionId không hợp lệ');
        }
        const issue = await createUserIssue(getPool(), {
          userId: Number(mutationUser.id),
          relatedTransactionId,
          title: requiredString(body.title, 'title', 160),
          description: requiredString(body.description, 'description', 4000),
          category: body.category,
          idempotencyKey: idempotencyKey(req),
          requestHash: canonicalHash(body),
        });
        return send(res, 201, { data: issue });
      }
      const adminNoteMatch = path.match(/^\/api\/v1\/admin\/issues\/(\d+)\/notes$/);
      if (method === 'POST' && adminNoteMatch && mutationUser) {
        requireAdmin(mutationUser);
        const note = await addAdminIssueNote(
          Number(mutationUser.id),
          Number(adminNoteMatch[1]),
          requiredString(body.note, 'note', 4000),
          idempotencyKey(req),
          canonicalHash(body),
        );
        return send(res, 201, { data: note });
      }
      const adminIssueMatch = path.match(/^\/api\/v1\/admin\/issues\/(\d+)$/);
      if (method === 'PATCH' && adminIssueMatch && mutationUser) {
        requireAdmin(mutationUser);
        const result = await updateAdminIssue(Number(mutationUser.id), Number(adminIssueMatch[1]), {
          ...(body.status === undefined ? {} : { status: body.status }),
          ...(body.priority === undefined ? {} : { priority: body.priority }),
        });
        return send(res, 200, { data: result });
      }
      if (mutationUser) {
        const result = await handleDomainRequest(
          method,
          path.replace(/^\/api\/v1/, ''),
          new URL(req.url || '/', 'http://localhost').searchParams,
          body,
          req.headers,
          mutationUser,
        );
        if (result) return send(res, result.status, result.body);
      }
    }

    if (method === 'GET' && path === '/api/v1/auth/google/callback') {
      const flowCookie = readNamedCookie(req, googleOAuth.cookieName);
      const clearFlowCookie = googleOAuth.clearCookie();
      try {
        const flow = await googleOAuth.complete(new URL(req.url || '/', 'http://localhost').searchParams, flowCookie);
        if (flow.mode === 'link') {
          const user = token ? await getSession(token) : null;
          if (!user || user.id !== flow.userId) throw new AppError(401, 'UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn');
          await linkGoogleIdentity(user.id, flow.identity);
          return redirect(res, appLocation('google_linked'), [clearFlowCookie]);
        }
        const result = await loginWithGoogle(flow.identity, clientIp(req));
        return redirect(res, appLocation('google_login'), [cookie(result.token), clearFlowCookie]);
      } catch (error) {
        const key = googleErrorKey(error);
        return redirect(res, appLocation(key, true), [clearFlowCookie]);
      }
    }

    if (method === 'GET' && path === '/api/v1/auth/session') {
      const user = token ? await getSession(token) : null;
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập');
      return send(res, 200, { data: { user, csrfToken: await getCsrf(token), googleLinked: await hasGoogleIdentity(user.id) } });
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
      const userId = userMatch[1];
      if (!userId || !/^\d+$/.test(userId)) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản');
      if (user.id !== userId) throw new AppError(403, 'FORBIDDEN', 'Không có quyền xem tài khoản này');
      return send(res, 200, { data: user });
    }

    if (method === 'GET' && path === '/api/v1/admin/stats') {
      const user = token ? await getSession(token) : null;
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập');
      if (user.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Không có quyền quản trị');
      const stats = await getAdminStats();
      return send(res, 200, { data: stats });
    }

    if (method === 'GET' && path === '/api/v1/issues/me') {
      const user = token ? await getSession(token) : null;
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập');
      const query = issuePageQuery(new URL(req.url || '/', 'http://localhost').searchParams);
      return send(res, 200, { ...await listUserIssues(getPool(), Number(user.id), query.cursor, query.limit) });
    }

    if (method === 'GET' && path === '/api/v1/admin/issues') {
      const user = token ? await getSession(token) : null;
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập');
      requireAdmin(user);
      const search = new URL(req.url || '/', 'http://localhost').searchParams;
      const query = issuePageQuery(search);
      const issues = await listAdminIssues(getPool(), {
        ...query,
        ...(search.has('status') ? { status: search.get('status') } : {}),
        ...(search.has('priority') ? { priority: search.get('priority') } : {}),
      });
      return send(res, 200, issues);
    }

    const adminIssueMatch = path.match(/^\/api\/v1\/admin\/issues\/(\d+)$/);
    if (method === 'GET' && adminIssueMatch) {
      const user = token ? await getSession(token) : null;
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập');
      requireAdmin(user);
      return send(res, 200, { data: await getAdminIssue(getPool(), Number(adminIssueMatch[1])) });
    }

    if (method === 'GET' && path === '/api/v1/admin/audit-logs') {
      const user = token ? await getSession(token) : null;
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập');
      requireAdmin(user);
      const query = issuePageQuery(new URL(req.url || '/', 'http://localhost').searchParams);
      return send(res, 200, await listAdminAuditLogs(query.cursor, query.limit));
    }

    if (method === 'GET' && /^\/api\/v1\/(wallet|ledger|savings|categories|budgets|reports)(\/|$)/.test(path)) {
      const user = token ? await getSession(token) : null;
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập');
      const result = await handleDomainRequest(
        method,
        path.replace(/^\/api\/v1/, ''),
        new URL(req.url || '/', 'http://localhost').searchParams,
        {},
        req.headers,
        user,
      );
      if (result) return send(res, result.status, result.body);
    }

    return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn' } });
  } catch (error) {
    if (error instanceof AppError) {
      const headers = error.retryAfterSeconds === undefined ? {} : { 'Retry-After': String(error.retryAfterSeconds) };
      return send(res, error.status, { error: { code: error.code, message: error.message } }, undefined, headers);
    }
    if (error instanceof DomainError) {
      const status = [403, 404, 409, 422].includes(error.status) ? error.status : 422;
      return send(res, status, {
        error: {
          code: error.code,
          message: status === 404 ? 'Không tìm thấy dữ liệu' : 'Yêu cầu không thể xử lý theo trạng thái hiện tại',
        },
      });
    }
    // Không trả lỗi cơ sở dữ liệu hoặc SMTP ra trình duyệt.
    return send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Hệ thống đang bận, vui lòng thử lại' } });
  }
}

export function createApiServer(options: { emailSender?: OtpSender; googleOAuth?: GoogleOAuthProvider } = {}) {
  const emailSender = options.emailSender ?? sendOtp;
  const googleOAuth = options.googleOAuth ?? createGoogleOAuthProvider();
  return createServer((req, res) => handleRequest(req, res, emailSender, googleOAuth));
}
