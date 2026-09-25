import type { Pool } from 'mysql2/promise';
import type { SessionRepository, OAuthChallengeStore } from '../types/index.js';
export declare function createSessionRepository(pool: Pool): SessionRepository;
export declare function createOAuthChallengeStore(pool: Pool): OAuthChallengeStore;
