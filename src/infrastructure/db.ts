import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from './db/pool.ts';

export interface UserRow extends RowDataPacket {
  id: string | number;
  email: string;
  display_name: string;
  locale: 'vi' | 'en';
  role: 'user' | 'admin' | 'security';
  email_verified: number;
  status: 'active' | 'disabled';
}

export interface OtpRow extends RowDataPacket {
  id: string;
  otp_hash: string;
  attempts: number;
  max_attempts: number;
  expires_at: Date;
  created_at: Date;
}

export function getDb() {
  return getPool();
}
