import { createHmac } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { getDb } from '../../infrastructure/db.js';

export interface AuthRateLimitPolicy {
  scope: string;
  value: string;
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
}

interface RateLimitRow extends RowDataPacket {
  attempt_count: number;
  window_started_at: Date;
  blocked_until: Date | null;
}

const RATE_LIMIT_ROW_RETENTION_MS = 86_400_000;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 900_000;
const RATE_LIMIT_CLEANUP_BATCH_SIZE = 500;
let lastCleanupAt = 0;

function bucketHash(policy: AuthRateLimitPolicy) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('AUTH_RATE_LIMIT_SECRET chưa hợp lệ');
  }
  return createHmac('sha256', secret).update(`${policy.scope}\0${policy.value}`).digest();
}

async function updateBuckets(
  policies: readonly AuthRateLimitPolicy[],
  mode: 'check' | 'quota' | 'failure',
): Promise<number | null> {
  const db = await getDb().getConnection();
  const now = Date.now();
  const buckets = policies
    .map(policy => ({ policy, hash: bucketHash(policy) }))
    .sort((left, right) => Buffer.compare(left.hash, right.hash));
  let retryAfterSeconds: number | null = null;

  try {
    await db.beginTransaction();
    if (now - lastCleanupAt >= RATE_LIMIT_CLEANUP_INTERVAL_MS) {
      await db.execute(
        `DELETE FROM auth_rate_limits
         WHERE updated_at < TIMESTAMPADD(MICROSECOND, ?, UTC_TIMESTAMP(3))
         ORDER BY updated_at ASC
         LIMIT ${RATE_LIMIT_CLEANUP_BATCH_SIZE}`,
        [-RATE_LIMIT_ROW_RETENTION_MS * 1000],
      );
      lastCleanupAt = now;
    }
    const active: Array<{ policy: AuthRateLimitPolicy; hash: Buffer; count: number }> = [];

    for (const bucket of buckets) {
      await db.execute(
        'INSERT IGNORE INTO auth_rate_limits (bucket_hash, attempt_count, window_started_at) VALUES (?, 0, UTC_TIMESTAMP(3))',
        [bucket.hash],
      );
      const [rows] = await db.execute<RateLimitRow[]>(
        'SELECT attempt_count, window_started_at, blocked_until FROM auth_rate_limits WHERE bucket_hash = ? FOR UPDATE',
        [bucket.hash],
      );
      const row = rows[0];
      if (!row) throw new Error('rate-limit bucket missing after insert');

      const expiredWindow = now - row.window_started_at.getTime() >= bucket.policy.windowMs;
      const expiredBlock = row.blocked_until !== null && row.blocked_until.getTime() <= now;
      const count = expiredWindow || expiredBlock ? 0 : row.attempt_count;
      if (expiredWindow || expiredBlock) {
        await db.execute(
          'UPDATE auth_rate_limits SET attempt_count = 0, window_started_at = UTC_TIMESTAMP(3), blocked_until = NULL WHERE bucket_hash = ?',
          [bucket.hash],
        );
      }

      if (row.blocked_until && row.blocked_until.getTime() > now) {
        const seconds = Math.ceil((row.blocked_until.getTime() - now) / 1000);
        retryAfterSeconds = Math.max(retryAfterSeconds ?? 0, seconds);
      }
      active.push({ ...bucket, count });
    }

    if (retryAfterSeconds === null && mode !== 'check') {
      for (const bucket of active) {
        const nextCount = bucket.count + 1;
        const shouldBlock = mode === 'failure' && nextCount >= bucket.policy.maxAttempts;
        const quotaReached = mode === 'quota' && nextCount >= bucket.policy.maxAttempts;
        const blockSeconds = shouldBlock || quotaReached ? Math.max(1, Math.ceil(bucket.policy.blockMs / 1000)) : null;
        await db.execute(
          `UPDATE auth_rate_limits
           SET attempt_count = ?,
               blocked_until = CASE WHEN ? IS NULL THEN NULL ELSE TIMESTAMPADD(SECOND, ?, UTC_TIMESTAMP(3)) END
           WHERE bucket_hash = ?`,
          [nextCount, blockSeconds, blockSeconds, bucket.hash],
        );
      }
    }

    await db.commit();
    return retryAfterSeconds;
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
}

export async function authRateLimitRetryAfter(policies: readonly AuthRateLimitPolicy[]) {
  return updateBuckets(policies, 'check');
}

export async function consumeAuthQuota(policies: readonly AuthRateLimitPolicy[]) {
  return updateBuckets(policies, 'quota');
}

export async function recordAuthFailures(policies: readonly AuthRateLimitPolicy[]) {
  return updateBuckets(policies, 'failure');
}

export async function clearAuthRateLimit(policy: AuthRateLimitPolicy) {
  await getDb().execute('DELETE FROM auth_rate_limits WHERE bucket_hash = ?', [bucketHash(policy)]);
}
