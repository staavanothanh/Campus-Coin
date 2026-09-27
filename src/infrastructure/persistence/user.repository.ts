import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { Db } from '../db/pool.ts';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  locale: 'en' | 'vi';
  role: string;
}

interface UserProfileRow extends RowDataPacket {
  id: number | string;
  email: string;
  display_name: string;
  locale: 'en' | 'vi';
  role: string;
}

export async function updateUserProfile(
  db: Db,
  userId: number,
  patch: { displayName?: string; locale?: 'en' | 'vi' },
): Promise<UserProfile | null> {
  const assignments: string[] = [];
  const values: unknown[] = [];
  if (patch.displayName !== undefined) {
    assignments.push('display_name = ?');
    values.push(patch.displayName);
  }
  if (patch.locale !== undefined) {
    assignments.push('locale = ?');
    values.push(patch.locale);
  }
  if (assignments.length === 0) return findUserProfile(db, userId);

  await db.query<ResultSetHeader>(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`, [...values, userId]);
  return findUserProfile(db, userId);
}

async function findUserProfile(db: Db, userId: number): Promise<UserProfile | null> {
  const [rows] = await db.execute<UserProfileRow[]>(
    'SELECT id, email, display_name, locale, role FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    email: row.email,
    displayName: row.display_name,
    locale: row.locale,
    role: row.role,
  };
}
