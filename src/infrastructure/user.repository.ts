import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { UserRepository, AppUser, GoogleUserInfo, Locale } from '../types/index.js';
import { generateUUID } from '../lib/crypto.js';
import { notFoundError } from '../lib/errors.js';

class MysqlUserRepository implements UserRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<AppUser | null> {
    const query = `
      SELECT id, display_name, email, role, status, locale, timezone, created_at, updated_at
      FROM users
      WHERE id = ?
    `;
    const [rows] = await this.pool.execute<RowDataPacket[]>(query, [id]);
    if (rows.length === 0) return null;
    
    return this.mapRowToAppUser(rows[0]);
  }

  async findByGoogleSub(sub: string): Promise<AppUser | null> {
    const query = `
      SELECT u.id, u.display_name, u.email, u.role, u.status, u.locale, u.timezone, u.created_at, u.updated_at
      FROM users u
      JOIN auth_identities ai ON u.id = ai.user_id
      WHERE ai.provider = 'google' AND ai.subject = ?
    `;
    const [rows] = await this.pool.execute<RowDataPacket[]>(query, [sub]);
    if (rows.length === 0) return null;
    
    return this.mapRowToAppUser(rows[0]);
  }

  async upsertByGoogleSub(info: GoogleUserInfo): Promise<AppUser> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const selectQuery = `
        SELECT u.id, u.display_name, u.email, u.role, u.status, u.locale, u.timezone, u.created_at, u.updated_at
        FROM users u
        JOIN auth_identities ai ON u.id = ai.user_id
        WHERE ai.provider = 'google' AND ai.subject = ?
        FOR UPDATE
      `;
      const [rows] = await conn.execute<RowDataPacket[]>(selectQuery, [info.sub]);
      
      let user: AppUser;
      
      if (rows.length > 0) {
        const row = rows[0];
        if (!row) {
          throw new Error('User row was not returned after a matching identity was found');
        }
        const updateQuery = `
          UPDATE users SET display_name = ?, email = ?, updated_at = NOW() WHERE id = ?
        `;
        await conn.execute(updateQuery, [info.name, info.email, row.id]);
        
        user = {
          id: row.id,
          displayName: info.name,
          email: info.email,
          role: row.role,
          status: row.status,
          locale: row.locale,
          timezone: row.timezone,
          createdAt: row.created_at,
          updatedAt: new Date()
        };
      } else {
        const insertUserQuery = `
          INSERT INTO users (display_name, email, role, status, locale, timezone, created_at, updated_at)
          VALUES (?, ?, 'user', 'active', 'vi', 'Asia/Ho_Chi_Minh', NOW(), NOW())
        `;
        const [userResult] = await conn.execute(insertUserQuery, [info.name, info.email]);
        const userIdStr = (userResult as any).insertId.toString();
        
        const insertIdentityQuery = `
          INSERT INTO auth_identities (user_id, provider, subject, created_at)
          VALUES (?, 'google', ?, NOW())
        `;
        await conn.execute(insertIdentityQuery, [userIdStr, info.sub]);
        
        user = {
          id: userIdStr,
          displayName: info.name,
          email: info.email,
          role: 'user',
          status: 'active',
          locale: 'vi',
          timezone: 'Asia/Ho_Chi_Minh',
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      await conn.commit();
      return user;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async updatePreferences(userId: string, prefs: { displayName?: string; locale?: Locale }): Promise<AppUser> {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (prefs.displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(prefs.displayName);
    }
    
    if (prefs.locale !== undefined) {
      updates.push('locale = ?');
      values.push(prefs.locale);
    }
    
    if (updates.length === 0) {
      const user = await this.findById(userId);
      if (!user) throw notFoundError('User not found');
      return user;
    }
    
    updates.push('updated_at = NOW()');
    values.push(userId);
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    const [result] = await this.pool.execute<any>(query, values);
    
    if (result.affectedRows === 0) {
      throw notFoundError('User not found');
    }
    
    const updatedUser = await this.findById(userId);
    if (!updatedUser) throw notFoundError('User not found');
    return updatedUser;
  }

  private mapRowToAppUser(row: any): AppUser {
    return {
      id: row.id,
      displayName: row.display_name,
      email: row.email,
      role: row.role,
      status: row.status,
      locale: row.locale,
      timezone: row.timezone,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export function createUserRepository(pool: Pool): UserRepository {
  return new MysqlUserRepository(pool);
}
