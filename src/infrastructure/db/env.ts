// DB environment: validate presence/shape fail-closed, tuyệt đối không in/log giá trị.
// Identifier bắt buộc: CAMPUS_COIN_DB_* (xem .env.example).

import { readFileSync } from "node:fs";
import { X509Certificate } from "node:crypto";

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
export class ServerEnvError extends Error {
  readonly code = "SERVER_ENV_INVALID";
  constructor(message: string) {
    super(message);
    this.name = "ServerEnvError";
  }
}

/** Signing key is read only by cursor operations and is never included in errors. */
export function readCursorSigningKey(env: NodeJS.ProcessEnv = process.env): string {
  const key = env["CAMPUS_COIN_CURSOR_SIGNING_KEY"];
  if (typeof key !== "string" || Buffer.byteLength(key, "utf8") < 32 || key.trim() !== key) {
    throw new ServerEnvError("CAMPUS_COIN_CURSOR_SIGNING_KEY must contain at least 32 non-padded bytes");
  }
  return key;
}

function requireValue(name: string, env: NodeJS.ProcessEnv): string {
  const value = env[name];
  if (value === undefined || value === null || value === "") {
    throw new DbEnvError(`missing required environment variable: ${name}`);
  }
  return value;
}

function readDbPassword(env: NodeJS.ProcessEnv): string {
  const value = env["CAMPUS_COIN_DB_PASSWORD"];
  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(env["CAMPUS_COIN_DB_HOST"] ?? "");
  const isDisposableTest = env["CAMPUS_COIN_TEST_DB"] === "1" && isLoopback;
  if (value === undefined || value === null || (value === "" && !isDisposableTest)) {
    throw new DbEnvError("missing required environment variable: CAMPUS_COIN_DB_PASSWORD");
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

export function assertDbTlsAllowed(dbEnv: Pick<DbEnv, "host" | "sslMode">, env: NodeJS.ProcessEnv = process.env): void {
  if (dbEnv.sslMode !== "required" && dbEnv.sslMode !== "verify-ca" && dbEnv.sslMode !== "disabled") {
    throw new DbEnvError("invalid CAMPUS_COIN_DB_SSL: expected required|verify-ca (disabled is local-only)");
  }
  if (dbEnv.sslMode !== "disabled") return;
  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(dbEnv.host);
  const isVercel = env["VERCEL"] === "1" || env["VERCEL"] === "true";
  if (!isLoopback || env["NODE_ENV"] === "production" || isVercel) {
    throw new DbEnvError("invalid CAMPUS_COIN_DB_SSL: expected required|verify-ca (disabled is local-only)");
  }
}
function parseSslMode(value: string | undefined, env: NodeJS.ProcessEnv): DbSslMode {
  if (value === undefined || value === "") return "required";
  if (value === "required" || value === "verify-ca") return value;
  if (value === "disabled") {
    assertDbTlsAllowed({ host: env["CAMPUS_COIN_DB_HOST"] ?? "", sslMode: "disabled" }, env);
    return value;
  }
  throw new DbEnvError("invalid CAMPUS_COIN_DB_SSL: expected required|verify-ca (disabled is local-only)");
}

export function readDbEnv(env: NodeJS.ProcessEnv = process.env): DbEnv {
  const host = requireValue("CAMPUS_COIN_DB_HOST", env);
  const database = requireValue("CAMPUS_COIN_DB_NAME", env);
  const user = requireValue("CAMPUS_COIN_DB_USER", env);
  const password = readDbPassword(env);
  const sslMode = parseSslMode(env["CAMPUS_COIN_DB_SSL"], env);
  const caPath = optionalValue("CAMPUS_COIN_DB_CA_PATH", env);
  const caBase64 = optionalValue("CAMPUS_COIN_DB_CA_BASE64", env);
  let caCertificate: string | undefined;

  if (caBase64 !== undefined) {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(caBase64) || caBase64.length % 4 !== 0) {
      throw new DbEnvError("CAMPUS_COIN_DB_CA_BASE64 must be valid base64 PEM");
    }
    caCertificate = Buffer.from(caBase64, "base64").toString("utf8");
  }

  if (sslMode === "verify-ca" && caCertificate === undefined) {
    if (caPath === undefined) {
      throw new DbEnvError("CAMPUS_COIN_DB_SSL=verify-ca requires CAMPUS_COIN_DB_CA_PATH or CAMPUS_COIN_DB_CA_BASE64");
    }
    try {
      caCertificate = readFileSync(caPath, "utf8");
    } catch {
      throw new DbEnvError("CAMPUS_COIN_DB_CA_PATH must point to a readable CA certificate");
    }
  }
  if (caCertificate !== undefined) {
    try {
      const certificates = caCertificate.split(/(?=-----BEGIN CERTIFICATE-----)/g).filter(part => part.trim().length > 0);
      if (certificates.length === 0 || certificates.some(certificate => !new X509Certificate(certificate))) {
        throw new Error("invalid certificate");
      }
    } catch {
      const source = caBase64 === undefined ? "CAMPUS_COIN_DB_CA_PATH" : "CAMPUS_COIN_DB_CA_BASE64";
      throw new DbEnvError(`${source} must contain valid PEM certificates`);
    }
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

/** Build the shared verified TLS option for the runtime pool, migration CLI and test harness. */
export function sslOption(env: DbEnv): DbSslOption | undefined {
  switch (env.sslMode) {
    case "verify-ca":
      // CA file/base64 is validated and loaded in readDbEnv before the pool is built.
      if (env.caCertificate === undefined) {
        throw new DbEnvError("CAMPUS_COIN_DB_SSL=verify-ca requires a validated CA certificate");
      }
      return { rejectUnauthorized: true, ca: env.caCertificate };
    case "disabled":
      // Chỉ local dev; production phải required|verify-ca (kiểm tra ở preflight).
      return undefined;
    case "required":
    default:
      return { rejectUnauthorized: true };
  }
}
