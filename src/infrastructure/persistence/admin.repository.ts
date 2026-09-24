import type { RowDataPacket } from 'mysql2/promise';
import type { Db } from '../db/pool.ts';

interface UserStatsRow extends RowDataPacket {
  total: number;
  verified: number;
}

export async function readUserStats(db: Db) {
  const [rows] = await db.query<UserStatsRow[]>(
    'SELECT COUNT(*) AS total, COALESCE(SUM(email_verified), 0) AS verified FROM users',
  );
  const row = rows[0];
  if (!row) throw new Error('user stats missing');
  return { totalUsers: Number(row.total), verifiedUsers: Number(row.verified) };
}
