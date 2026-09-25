import { Router } from 'express';
import type { AuthService } from '../../application/auth.service.js';
import type { AppConfig } from '../../app/config.js';
export declare function createAuthRouter(authService: AuthService, config: AppConfig): Router;
