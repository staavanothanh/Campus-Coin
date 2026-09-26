import express, { type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { createPool } from 'mysql2/promise';
import { config, validateConfigAtStartup } from './config.js';
import { createGoogleOAuthAdapter } from '../infrastructure/google-oauth.adapter.js';
import { createSessionRepository, createOAuthChallengeStore } from '../infrastructure/session.repository.js';
import { createUserRepository } from '../infrastructure/user.repository.js';
import { createAuthService } from '../application/auth.service.js';
import { createSessionMiddleware } from '../middleware/session.middleware.js';
import { createCsrfMiddleware } from '../middleware/csrf.middleware.js';
import { errorHandler } from '../middleware/error-handler.middleware.js';
import { createAuthRouter } from '../features/auth/auth.routes.js';
import { createPreferencesRouter } from '../features/auth/preferences.routes.js';
import { createHealthRouter } from '../features/health/health.routes.js';
import { handleApiRequest, type ApiDependencies } from '../api/handler.js';
import { timingSafeEqual } from '../lib/crypto.js';

export async function createApp() {
  if (typeof validateConfigAtStartup === 'function') {
    validateConfigAtStartup();
  }

  const pool = createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    connectionLimit: config.database.connectionLimit,
    ssl: config.database.ssl ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      ca: process.env.DB_CA_PATH ? (await import('node:fs')).readFileSync(process.env.DB_CA_PATH) : undefined
    } : undefined
  });

  const sessionRepo = createSessionRepository(pool);
  const userRepo = createUserRepository(pool);
  const challengeStore = createOAuthChallengeStore(pool);
  const googleAdapter = createGoogleOAuthAdapter(config);

  const authService = createAuthService(
    {
      googleOAuth: googleAdapter,
      challengeStore,
      sessionRepo,
      userRepo,
      config
    }
  );

  const app = express();

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // CORS Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && config.app.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Idempotency-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(createSessionMiddleware(authService, config));

  const csrfMiddleware = createCsrfMiddleware(config);

  // Mount routes
  app.use('/api/v1/auth', createAuthRouter(authService, config));

  const protectedRouter = express.Router();
  protectedRouter.use(csrfMiddleware);
  protectedRouter.use('/users/me/preferences', createPreferencesRouter(authService));

  app.use('/api/v1', protectedRouter);
  app.use('/api/v1/health', createHealthRouter(pool));

  // Delegate all core and issue OpenAPI routes (/reports, /ledger, /categories, /budgets, /savings, /issues)
  app.use('/api/v1', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const origin = req.get('origin') || `http://${req.get('host') || '127.0.0.1:3000'}`;
      const url = new URL(req.originalUrl, origin);

      const headers = new Headers();
      for (const [key, val] of Object.entries(req.headers)) {
        if (Array.isArray(val)) {
          for (const v of val) headers.append(key, v);
        } else if (val !== undefined) {
          headers.set(key, val);
        }
      }

      const init: RequestInit = {
        method: req.method,
        headers,
      };
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
        init.body = JSON.stringify(req.body);
      }

      const webRequest = new Request(url.toString(), init);

      const deps: ApiDependencies = {
        db: pool,
        allowedOrigins: new Set(config.app.allowedOrigins),
        resolveSession: async () => {
          if (!req.appUser) return null;
          return {
            userId: Number(req.appUser.id),
            role: req.appUser.role,
          };
        },
        verifyCsrf: async () => {
          if (!req.appSession) return false;
          const token = req.get('X-CSRF-Token');
          if (!token) return false;
          return timingSafeEqual(token, req.appSession.csrfToken);
        },
      };

      const webResponse = await handleApiRequest(webRequest, deps);

      if (webResponse.status === 404) {
        const cloned = webResponse.clone();
        try {
          const body = (await cloned.json()) as { error?: { code?: string } };
          if (body?.error?.code === 'NOT_FOUND') {
            return next();
          }
        } catch {
          // not JSON, continue
        }
      }

      res.status(webResponse.status);
      webResponse.headers.forEach((val, key) => {
        if (key.toLowerCase() !== 'content-length') {
          res.setHeader(key, val);
        }
      });
      const responseText = await webResponse.text();
      res.send(responseText);
    } catch (err) {
      next(err);
    }
  });

  app.use(errorHandler);

  return { app, pool };
}

if (process.env.VERCEL !== '1') {
  createApp().then(({ app }) => {
    const port = config.app.port;
    app.listen(port, () => console.log(`Campus Coin API listening on port ${port}`));
  }).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
