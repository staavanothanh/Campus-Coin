import { RequestHandler } from 'express';
import type { AppConfig } from '../app/config.js';
export declare function createCsrfMiddleware(config: AppConfig): RequestHandler;
