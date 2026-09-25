// DB environment: validate presence/shape fail-closed, tuyệt đối không in/log giá trị.
// Identifier bắt buộc: CAMPUS_COIN_DB_* (xem .env.example).

import { readFileSync } from "node:fs";

export type DbSslMode = "required" | "verify-ca" | "disabled";

export interface DbEnv {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  sslMode: DbSslMode;
  caPath: string | undefined;
  caCertificate: string | undefined;
  connectionLimit: number;
  migrateUser: string | undefined;
  migratePassword: string | undefined;
}

export class DbEnvError extends Error {
  readonly code = "DB_ENV_INVALID";
  constructor(message: string) {
    super(message);
    this.name = "DbEnvError";
  }
}

function requireValue(name: string, env: NodeJS.ProcessEnv): string {
  const value = env[name];
  if (value === undefined || value === null || value === "") {
    throw new DbEnvError(`missing required environment variable: ${name}`);
  }
  return value;
}

function optionalValue(name: string, env: NodeJS.ProcessEnv): string | undefined {
  const value = env[name];
  return value === undefined || value === "" ? undefined : value;
}

function parseIntInRange(name: string, value: string | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new DbEnvError(`invalid ${name}: expected integer in [${min}, ${max}]`);
  }
  return n;
}

function parseSslMode(value: string | undefined): DbSslMode {
  if (value === undefined || value === "") return "required";
  if (value === "required" || value === "verify-ca" || value === "disabled") return value;
  throw new DbEnvError(`invalid CAMPUS_COIN_DB_SSL: expected required|verify-ca|disabled`);
}

export function readDbEnv(env: NodeJS.ProcessEnv = process.env): DbEnv {
  const host = requireValue("CAMPUS_COIN_DB_HOST", env);
  const database = requireValue("CAMPUS_COIN_DB_NAME", env);
  const user = requireValue("CAMPUS_COIN_DB_USER", env);
  const password = requireValue("CAMPUS_COIN_DB_PASSWORD", env);
  const sslMode = parseSslMode(env["CAMPUS_COIN_DB_SSL"]);
  const caPath = optionalValue("CAMPUS_COIN_DB_CA_PATH", env);
  const caBase64 = optionalValue("CAMPUS_COIN_DB_CA_BASE64", env);
  let caCertificate: string | undefined;

  if (caBase64 !== undefined) {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(caBase64) || caBase64.length % 4 !== 0) {
      throw new DbEnvError("CAMPUS_COIN_DB_CA_BASE64 must be valid base64 PEM");
    }
    const decoded = Buffer.from(caBase64, "base64").toString("utf8");
    if (!decoded.includes("-----BEGIN CERTIFICATE-----") || !decoded.includes("-----END CERTIFICATE-----")) {
      throw new DbEnvError("CAMPUS_COIN_DB_CA_BASE64 must contain a PEM certificate");
    }
    caCertificate = decoded;
  }

  if (sslMode === "verify-ca" && caPath === undefined && caCertificate === undefined) {
    throw new DbEnvError(
      `CAMPUS_COIN_DB_SSL=verify-ca requires CAMPUS_COIN_DB_CA_PATH or CAMPUS_COIN_DB_CA_BASE64`,
    );
  }
  return {
    host,
    port: parseIntInRange("CAMPUS_COIN_DB_PORT", env["CAMPUS_COIN_DB_PORT"], 1, 65535, 3306),
    database,
    user,
    password,
    sslMode,
    caPath,
    caCertificate,
    connectionLimit: parseIntInRange(
      "CAMPUS_COIN_DB_CONNECTION_LIMIT",
      env["CAMPUS_COIN_DB_CONNECTION_LIMIT"],
      1,
      50,
      5,
    ),
    migrateUser: optionalValue("CAMPUS_COIN_DB_MIGRATE_USER", env),
    migratePassword: optionalValue("CAMPUS_COIN_DB_MIGRATE_PASSWORD", env),
  };
}

/** Migration role: dùng CAMPUS_COIN_DB_MIGRATE_* nếu có, else runtime role (local dev). */
export function migrationCreds(env: DbEnv): { user: string; password: string } {
  if (env.migrateUser !== undefined && env.migratePassword !== undefined) {
    return { user: env.migrateUser, password: env.migratePassword };
  }
  return { user: env.user, password: env.password };
}

/** SSL option cho mysql2 (ConnectionOptions và PoolOptions dùng cùng shape này). */
export interface DbSslOption {
  rejectUnauthorized: boolean;
  ca?: string;
}

/**
 * Dựng SSL option từ DbEnv — MỘT nguồn duy nhất cho pool, CLI migrate và test harness.
 * `verify-ca` đọc nội dung PEM từ `caPath`; mysql2 cần nội dung chứng chỉ, không phải
 * đường dẫn. Truyền path sẽ làm OpenSSL không tìm thấy CA và fail
 * "self-signed certificate in certificate chain" (đúng đường Aiven/free tier bắt buộc).
 */
export function sslOption(env: DbEnv): DbSslOption | undefined {
  switch (env.sslMode) {
    case "verify-ca":
      // Runtime serverless có thể nhận CA qua environment thay vì file local.
      return {
        rejectUnauthorized: true,
        ca: env.caCertificate ?? readFileSync(env.caPath!, "utf8"),
      };
    case "disabled":
      // Chỉ local dev; production phải required|verify-ca (kiểm tra ở preflight).
      return undefined;
    case "required":
    default:
      return { rejectUnauthorized: true };
  }
}
