import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppUser, AppSession } from '../types/index.js';
import type { AppConfig } from '../app/config.js';
import type { AuthService } from '../application/auth.service.js';

declare global {
  namespace Express {
    interface Request {
      appSession?: AppSession;
      appUser?: AppUser;
    }
  }
}

export function createSessionMiddleware(authService: AuthService, config: AppConfig): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cookieName = config.session.cookieName;
      const rawSessionId = req.cookies?.[cookieName];

      if (!rawSessionId) {
        req.appSession = undefined;
        req.appUser = undefined;
        return next();
      }

      const result = await authService.getSession(rawSessionId);
      
      if (!result) {
        res.clearCookie(cookieName, {
          httpOnly: true,
          secure: config.session.secure,
          sameSite: config.session.sameSite,
          path: '/',
          domain: config.session.domain
        });
        req.appSession = undefined;
        req.appUser = undefined;
        return next();
      }

      req.appSession = result.session;
      req.appUser = result.user;
      next();
    } catch (error) {
      req.appSession = undefined;
      req.appUser = undefined;
      next();
    }
  };
}
