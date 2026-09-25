import { Request, Response, NextFunction } from 'express';
import { isAppError } from '../lib/errors.js';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store, private');

  if (isAppError(err)) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  // Log sanitized error without exposing stack trace or secrets
  console.error('Unhandled server error:', err?.message || 'Unknown error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
}
