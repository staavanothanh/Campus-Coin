import { Request, Response, NextFunction, RequestHandler } from 'express';
import { timingSafeEqual } from '../lib/crypto.js';
import { csrfError, unauthorizedError } from '../lib/errors.js';
import type { AppConfig } from '../app/config.js';

export function createCsrfMiddleware(config: AppConfig): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const nonStateChangingMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (nonStateChangingMethods.includes(req.method)) {
      return next();
    }

    const origin = req.get('Origin');
    const referer = req.get('Referer');
    const allowedOrigins = config.app.allowedOrigins;

    const requestOrigin = origin || (referer ? new URL(referer).origin : null);

    if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
      return next(csrfError());
    }

    if (!req.appSession) {
      return next(unauthorizedError());
    }

    const csrfTokenHeader = req.get('X-CSRF-Token');
    if (!csrfTokenHeader || typeof csrfTokenHeader !== 'string') {
      return next(csrfError());
    }

    try {
      const isValid = timingSafeEqual(csrfTokenHeader, req.appSession.csrfToken);
      if (!isValid) {
        return next(csrfError());
      }
      next();
    } catch (error) {
      return next(csrfError());
    }
  };
}
