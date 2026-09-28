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

export interface CategoryAdminMetricsRow extends RowDataPacket {
  applies_to: 'income' | 'payment';
  status: 'active' | 'disabled' | 'retired';
  count: number;
}

export interface IssueMetricsRow extends RowDataPacket {
  status: 'open' | 'in_triage' | 'resolved' | 'closed';
  count: number;
}

export interface IssuePriorityMetricsRow extends RowDataPacket {
  priority: 'P0' | 'P1' | 'P2';
  count: number;
}

export interface AuditMetricsRow extends RowDataPacket {
  outcome: 'success' | 'failure';
  count: number;
}

/** Aggregate vận hành từ các bảng append-only/hiện có; không đọc nội dung row. */
export async function readAdminMetrics(db: Db) {
  const [userRows] = await db.query<UserStatsRow[]>(
    'SELECT COUNT(*) AS total, COALESCE(SUM(email_verified), 0) AS verified FROM users',
  );
  const [activeDisabledRows] = await db.query<RowDataPacket[]>(
    "SELECT COALESCE(SUM(status = 'active'), 0) AS active, COALESCE(SUM(status = 'disabled'), 0) AS disabled FROM users",
  );
  const [issueRows] = await db.query<IssueMetricsRow[]>(
    'SELECT status, COUNT(*) AS count FROM issues GROUP BY status',
  );
  const [priorityRows] = await db.query<IssuePriorityMetricsRow[]>(
    'SELECT priority, COUNT(*) AS count FROM issues GROUP BY priority',
  );
  const [auditRows] = await db.query<AuditMetricsRow[]>(
    'SELECT outcome, COUNT(*) AS count FROM audit_events GROUP BY outcome',
  );
  const issueTotals = issueRows.length === 0 ? {} : Object.fromEntries(issueRows.map(row => [row.status, Number(row.count)]));
  const priorityTotals = priorityRows.length === 0 ? {} : Object.fromEntries(priorityRows.map(row => [row.priority, Number(row.count)]));
  const auditTotals = auditRows.length === 0 ? {} : Object.fromEntries(auditRows.map(row => [row.outcome, Number(row.count)]));
  const userRow = userRows[0];
  const stateRow = activeDisabledRows[0];
  if (!userRow || !stateRow) throw new Error('admin metrics missing');

  return {
    users: {
      totalUsers: Number(userRow.total),
      verifiedUsers: Number(userRow.verified),
      activeUsers: Number(stateRow.active),
      disabledUsers: Number(stateRow.disabled),
    },
    issues: {
      total: Object.values(issueTotals).reduce((sum, value) => sum + Number(value), 0),
      byStatus: {
        open: issueTotals.open ?? 0,
        in_triage: issueTotals.in_triage ?? 0,
        resolved: issueTotals.resolved ?? 0,
        closed: issueTotals.closed ?? 0,
      },
      byPriority: {
        P0: priorityTotals.P0 ?? 0,
        P1: priorityTotals.P1 ?? 0,
        P2: priorityTotals.P2 ?? 0,
      },
    },
    audit: {
      success: auditTotals.success ?? 0,
      failure: auditTotals.failure ?? 0,
    },
  };
}
