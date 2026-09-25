import type { Pool } from 'mysql2/promise';
import type { UserRepository } from '../types/index.js';
export declare function createUserRepository(pool: Pool): UserRepository;
