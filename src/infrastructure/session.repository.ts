import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { SessionRepository, OAuthChallengeStore, AppSession, OAuthChallenge } from '../types/index.js';

class MysqlSessionRepository implements SessionRepository {
  constructor(private pool: Pool) {}

  async create(session: AppSession): Promise<void> {
    const query = `
      INSERT INTO sessions (hashed_id, user_id, csrf_token, issued_at, expires_at, revoked_at, last_seen_at, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.pool.execute(query, [
      session.hashedId,
      session.userId,
      session.csrfToken,
      session.issuedAt,
      session.expiresAt,
      session.revokedAt,
      session.lastSeenAt,
      session.userAgent
    ]);
  }

  async findByHashedId(hashedId: string): Promise<AppSession | null> {
    const query = `
      SELECT hashed_id, user_id, csrf_token, issued_at, expires_at, revoked_at, last_seen_at, user_agent
      FROM sessions
      WHERE hashed_id = ? AND revoked_at IS NULL AND expires_at > NOW()
    `;
    const [rows] = await this.pool.execute<RowDataPacket[]>(query, [hashedId]);
    if (rows.length === 0) return null;
    
    const row = rows[0];
    if (!row) return null;
    return {
      hashedId: row.hashed_id,
      userId: row.user_id,
      csrfToken: row.csrf_token,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      lastSeenAt: row.last_seen_at,
      userAgent: row.user_agent
    };
  }

  async updateLastSeen(hashedId: string, lastSeenAt: Date): Promise<void> {
    const query = `UPDATE sessions SET last_seen_at = ? WHERE hashed_id = ?`;
    await this.pool.execute(query, [lastSeenAt, hashedId]);
  }

  async revoke(hashedId: string): Promise<void> {
    const query = `UPDATE sessions SET revoked_at = NOW() WHERE hashed_id = ?`;
    await this.pool.execute(query, [hashedId]);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const query = `UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`;
    await this.pool.execute(query, [userId]);
  }

  async deleteExpired(): Promise<number> {
    const query = `DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL 7 DAY`;
    const [result] = await this.pool.execute<ResultSetHeader>(query);
    return result.affectedRows;
  }
}

class MysqlOAuthChallengeStore implements OAuthChallengeStore {
  constructor(private pool: Pool) {}

  async save(challenge: OAuthChallenge): Promise<void> {
    const query = `
      INSERT INTO oauth_challenges (state, nonce, code_verifier, code_challenge, redirect_uri, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await this.pool.execute(query, [
      challenge.state,
      challenge.nonce,
      challenge.codeVerifier,
      challenge.codeChallenge,
      challenge.redirectUri,
      challenge.expiresAt
    ]);
  }

  async consumeByState(state: string): Promise<OAuthChallenge | null> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const selectQuery = `
        SELECT state, nonce, code_verifier, code_challenge, redirect_uri, expires_at
        FROM oauth_challenges
        WHERE state = ? AND expires_at > NOW()
        FOR UPDATE
      `;
      const [rows] = await conn.execute<RowDataPacket[]>(selectQuery, [state]);
      
      if (rows.length === 0) {
        await conn.rollback();
        return null;
      }
      
      const row = rows[0];
      if (!row) {
        await conn.rollback();
        return null;
      }
      const challenge: OAuthChallenge = {
        state: row.state,
        nonce: row.nonce,
        codeVerifier: row.code_verifier,
        codeChallenge: row.code_challenge,
        redirectUri: row.redirect_uri,
        createdAt: row.created_at,
        expiresAt: row.expires_at
      };
      
      const deleteQuery = `DELETE FROM oauth_challenges WHERE state = ?`;
      await conn.execute(deleteQuery, [state]);
      
      await conn.commit();
      return challenge;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async deleteExpired(): Promise<void> {
    const query = `DELETE FROM oauth_challenges WHERE expires_at < NOW()`;
    await this.pool.execute(query);
  }
}

export function createSessionRepository(pool: Pool): SessionRepository {
  return new MysqlSessionRepository(pool);
}

export function createOAuthChallengeStore(pool: Pool): OAuthChallengeStore {
  return new MysqlOAuthChallengeStore(pool);
}
