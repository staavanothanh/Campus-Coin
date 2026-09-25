import { RequestHandler } from 'express';
import { UserRole } from '../types/index.js';
export declare const requireAuth: RequestHandler;
export declare function requireRole(...roles: UserRole[]): RequestHandler;
