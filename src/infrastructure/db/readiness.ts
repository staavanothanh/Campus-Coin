import type { RowDataPacket } from 'mysql2/promise';
import { getDb } from '../db.js';

const REQUIRED_MIGRATIONS = ['0001', '0002', '0003', '0004', '0005'] as const;
const REQUIRED_TABLES = [
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
] as const;

export interface SchemaReadiness {
  ready: boolean;
  missingMigrations: string[];
  missingTables: string[];
}

export function evaluateSchemaReadiness(
  migrationVersions: readonly string[],
  tableNames: readonly string[],
): SchemaReadiness {
  const migrations = new Set(migrationVersions);
  const tables = new Set(tableNames);
  const missingMigrations = REQUIRED_MIGRATIONS.filter(version => !migrations.has(version));
  const missingTables = REQUIRED_TABLES.filter(name => !tables.has(name));
  return {
    ready: missingMigrations.length === 0 && missingTables.length === 0,
    missingMigrations: [...missingMigrations],
    missingTables: [...missingTables],
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
  const [migrationRows] = await db.query<(RowDataPacket & { version: string })[]>(
    'SELECT version FROM schema_migrations',
  );
  const [tableRows] = await db.query<(RowDataPacket & { TABLE_NAME: string })[]>(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()',
  );
  const status = evaluateSchemaReadiness(
    migrationRows.map(row => row.version),
    tableRows.map(row => row.TABLE_NAME),
  );
  if (!status.ready) throw new SchemaNotReadyError();
}
