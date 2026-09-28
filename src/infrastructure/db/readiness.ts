import type { RowDataPacket } from 'mysql2/promise';
import path from 'node:path';
import { getDb } from '../db.js';
import { planMigrations, scanMigrationDir, type MigrationFile } from './migration-engine.js';

const READINESS_REQUIRED_TABLES = [
  'schema_migrations',
  'users',
  'auth_identities',
  'sessions',
  'auth_credentials',
  'email_otps',
  'auth_rate_limits',
  'wallet_accounts',
  'mutation_idempotency',
  'ledger_transactions',
  'categories',
  'budgets',
  'savings_accounts',
  'savings_transfers',
  'issues',
  'issue_events',
  'audit_events',
  'cashflow_plans',
  'cashflow_plan_status_events',
] as const;
const READINESS_REQUIRED_COLUMNS = [
  { tableName: 'wallet_accounts', columnName: 'available_balance_vnd' },
  { tableName: 'ledger_transactions', columnName: 'user_id' },
  { tableName: 'ledger_transactions', columnName: 'amount_vnd' },
  { tableName: 'ledger_transactions', columnName: 'item_name' },
] as const;

export interface SchemaReadiness {
  ready: boolean;
  missingMigrations: string[];
  mismatchedMigrations: string[];
  unknownAppliedMigrations: string[];
  missingTables: string[];
  missingColumns: string[];
}

export function evaluateSchemaReadiness(
  expectedMigrations: readonly MigrationFile[],
  appliedMigrations: readonly { version: string; checksum: string }[],
  tableNames: readonly string[],
  availableColumns: readonly { tableName: string; columnName: string }[],
): SchemaReadiness {
  const plan = planMigrations(
    [...expectedMigrations],
    new Map(appliedMigrations.map(migration => [migration.version, migration.checksum])),
  );
  const expectedVersions = new Set(expectedMigrations.map(migration => migration.version));
  const unknownAppliedMigrations = appliedMigrations
    .filter(migration => !expectedVersions.has(migration.version))
    .map(migration => migration.version);
  const tables = new Set(tableNames);
  const columns = new Set(availableColumns.map(column => `${column.tableName}.${column.columnName}`));
  const missingMigrations = plan.pending.map(migration => migration.version);
  const mismatchedMigrations = plan.appliedMismatch.map(migration => migration.version);
  const missingTables = READINESS_REQUIRED_TABLES.filter(name => !tables.has(name));
  const missingColumns = READINESS_REQUIRED_COLUMNS
    .filter(column => !columns.has(`${column.tableName}.${column.columnName}`))
    .map(column => `${column.tableName}.${column.columnName}`);
  return {
    ready: missingMigrations.length === 0
      && mismatchedMigrations.length === 0
      && unknownAppliedMigrations.length === 0
      && missingTables.length === 0
      && missingColumns.length === 0,
    missingMigrations: [...missingMigrations],
    mismatchedMigrations: [...mismatchedMigrations],
    unknownAppliedMigrations: [...unknownAppliedMigrations],
    missingTables: [...missingTables],
    missingColumns: [...missingColumns],
  };
}

export class SchemaNotReadyError extends Error {
  constructor() {
    super('Required database schema is not ready');
    this.name = 'SchemaNotReadyError';
  }
}

export async function assertSchemaReady(): Promise<void> {
  const db = getDb();
  const expectedMigrations = await scanMigrationDir(path.resolve(process.cwd(), 'db', 'migrations'));
  const [migrationRows] = await db.query<(RowDataPacket & { version: string; checksum: string })[]>(
    'SELECT version, checksum FROM schema_migrations',
  );
  const tablePlaceholders = READINESS_REQUIRED_TABLES.map(() => '?').join(', ');
  const columnConditions = READINESS_REQUIRED_COLUMNS
    .map(() => '(TABLE_NAME = ? AND COLUMN_NAME = ?)')
    .join(' OR ');
  const metadataValues = [
    ...READINESS_REQUIRED_TABLES,
    ...READINESS_REQUIRED_COLUMNS.flatMap(column => [column.tableName, column.columnName]),
  ];
  const [metadataRows] = await db.query<(
    RowDataPacket & { TABLE_NAME: string; COLUMN_NAME: string | null; object_type: 'table' | 'column' }
  )[]>(
    `SELECT TABLE_NAME, NULL AS COLUMN_NAME, 'table' AS object_type
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${tablePlaceholders})
     UNION ALL
     SELECT TABLE_NAME, COLUMN_NAME, 'column' AS object_type
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND (${columnConditions})`,
    metadataValues,
  );
  const status = evaluateSchemaReadiness(
    expectedMigrations,
    migrationRows.map(row => ({ version: row.version, checksum: row.checksum })),
    metadataRows.filter(row => row.object_type === 'table').map(row => row.TABLE_NAME),
    metadataRows
      .filter((row): row is typeof row & { COLUMN_NAME: string } => row.object_type === 'column' && row.COLUMN_NAME !== null)
      .map(row => ({ tableName: row.TABLE_NAME, columnName: row.COLUMN_NAME })),
  );
  if (!status.ready) throw new SchemaNotReadyError();
}
