import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { Db } from '../db/pool.ts';
import { idFromDb, isoFromDb } from './rows.ts';
import type { ProfileGender } from '../../domain/user-profile.ts';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  locale: 'en' | 'vi';
  role: string;
  birthDate: string | null;
  gender: ProfileGender | null;
}

export interface AdminUserRow {
  id: number;
  email: string;
  displayName: string;
  role: 'user' | 'admin' | 'security';
  status: 'active' | 'disabled';
  locale: 'en' | 'vi';
  createdAt: string;
}

interface AdminUserDbRow extends RowDataPacket {
  id: number | string;
  email: string;
  display_name: string;
  role: 'user' | 'admin' | 'security';
  status: 'active' | 'disabled';
  locale: 'en' | 'vi';
  created_at: Date;
}

export function mapAdminUser(row: AdminUserDbRow): AdminUserRow {
  return {
    id: idFromDb(row.id),
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    locale: row.locale,
    createdAt: isoFromDb(row.created_at),
  };
}

/** Unscoped user listing/update is reserved for callers with a verified admin actor. */
export async function listAdminUsersPage(
  db: Db,
  cursorId: number | null,
  limit: number,
): Promise<{ rows: AdminUserRow[]; hasNext: boolean }> {
  const [rows] = (await db.query<AdminUserDbRow[]>(
    `SELECT id, email, display_name, role, status, locale, created_at
     FROM users
     WHERE (? IS NULL OR id < ?)
     ORDER BY id DESC
     LIMIT ?`,
    [cursorId, cursorId, limit + 1],
  )) as [AdminUserDbRow[], unknown];
  const hasNext = rows.length > limit;
  return { rows: rows.slice(0, limit).map(mapAdminUser), hasNext };
}

export async function findUserByIdForAdmin(db: Db, userId: number): Promise<AdminUserRow | null> {
  const [rows] = (await db.query<AdminUserDbRow[]>(
    'SELECT id, email, display_name, role, status, locale, created_at FROM users WHERE id = ? LIMIT 1',
    [userId],
  )) as [AdminUserDbRow[], unknown];
  const row = rows[0];
  return row === undefined ? null : mapAdminUser(row);
}

export async function updateUserStatusByAdmin(
  conn: { query(sql: string, params?: unknown[]): Promise<unknown> },
  userId: number,
  status: 'active' | 'disabled',
): Promise<boolean> {
  const [result] = (await conn.query('UPDATE users SET status = ? WHERE id = ?', [status, userId])) as [
    { affectedRows: number },
    unknown,
  ];
  return result.affectedRows === 1;
}

interface UserProfileRow extends RowDataPacket {
  id: number | string;
  email: string;
  display_name: string;
  locale: 'en' | 'vi';
  role: string;
  birth_date: string | null;
  gender: ProfileGender | null;
}

export async function updateUserProfile(
  db: Db,
  userId: number,
  patch: { displayName?: string; locale?: 'en' | 'vi'; birthDate?: string | null; gender?: ProfileGender | null },
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
  if (patch.birthDate !== undefined) {
    assignments.push('birth_date = ?');
    values.push(patch.birthDate);
  }
  if (patch.gender !== undefined) {
    assignments.push('gender = ?');
    values.push(patch.gender);
  }
  if (assignments.length === 0) return findUserProfile(db, userId);

  await db.query<ResultSetHeader>(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`, [...values, userId]);
  return findUserProfile(db, userId);
}

async function findUserProfile(db: Db, userId: number): Promise<UserProfile | null> {
  const [rows] = await db.execute<UserProfileRow[]>(
    "SELECT id, email, display_name, locale, role, DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date, gender FROM users WHERE id = ? LIMIT 1",
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
    birthDate: row.birth_date,
    gender: row.gender,
  };
}
