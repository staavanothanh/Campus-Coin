import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/require-auth.middleware.js';
import type { AuthService } from '../../application/auth.service.js';
import type { AppConfig } from '../../app/config.js';

export function createAuthRouter(authService: AuthService, config: AppConfig): Router {
  const router = Router();

  router.get('/google/start', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { authUrl } = await authService.startOAuth(config.google.callbackUrl);
      res.redirect(302, authUrl);
    } catch (error) {
      next(error);
    }
  });

  router.get('/google/callback', async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;

      if (typeof code !== 'string' || typeof state !== 'string') {
        throw new Error('Invalid callback parameters');
      }

      const userAgent = req.headers['user-agent'] ?? null;
      const { rawSessionId, redirectTo } = await authService.handleCallback(code, state, userAgent);

      res.cookie(config.session.cookieName, rawSessionId, {
        httpOnly: true,
        secure: config.session.secure,
        sameSite: config.session.sameSite,
        path: '/',
        maxAge: config.session.maxAgeMs,
        domain: config.session.domain
      });

      res.redirect(302, redirectTo || '/');
    } catch (error) {
      res.redirect(302, '/login?error=auth_failed');
    }
  });

  router.get('/session', requireAuth, (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, private');
    
    res.status(200).json({
      data: {
        user: {
          id: req.appUser!.id,
          displayName: req.appUser!.displayName,
          email: req.appUser!.email,
          locale: req.appUser!.locale,
          role: req.appUser!.role
        },
        walletInitialized: false,
        csrfToken: req.appSession!.csrfToken
      }
    });
  });

  router.post('/logout', async (req: Request, res: Response) => {
    const rawSessionId = req.cookies?.[config.session.cookieName];

    if (rawSessionId) {
      try {
        await authService.logout(rawSessionId);
      } catch (error) {
        // Ignore logout errors, ensure cookie clears
      }
    }

    res.cookie(config.session.cookieName, '', {
      httpOnly: true,
      secure: config.session.secure,
      sameSite: config.session.sameSite,
      path: '/',
      maxAge: 0,
      domain: config.session.domain
    });

    res.status(204).end();
  });

  return router;
}
