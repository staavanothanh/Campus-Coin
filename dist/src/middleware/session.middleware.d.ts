import { RequestHandler } from 'express';
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
export declare function createSessionMiddleware(authService: AuthService, config: AppConfig): RequestHandler;
