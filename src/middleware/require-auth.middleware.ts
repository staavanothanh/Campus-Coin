import { Request, Response, NextFunction, RequestHandler } from 'express';
import { unauthorizedError, accountDisabledError, forbiddenError } from '../lib/errors.js';
import { UserRole } from '../types/index.js';

export const requireAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.appUser) {
    return next(unauthorizedError());
  }
  
  if (req.appUser.status === 'disabled') {
    return next(accountDisabledError());
  }

  next();
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, (err?: any) => {
      if (err) return next(err);

      if (!req.appUser || !roles.includes(req.appUser.role)) {
        return next(forbiddenError());
      }
      next();
    });
  };
}
