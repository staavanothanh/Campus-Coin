import { canonicalHash } from "../lib/hash.js";
import {
  createCorrection,
  createTransaction,
  getTransaction,
  listTransactions,
} from "../application/ledger.service.js";
import { upsertUserBudget, listMonthBudgets, monthBudgetSummary } from "../application/budget.service.js";
import { createCustomCategory, listUserCategories, updateUserCategory } from "../application/category.service.js";
import { dashboard, monthlyReport } from "../application/report.service.js";
import { createTransfer, getSavings, listTransfers } from "../application/savings.service.js";
import { getWallet, initializeWallet } from "../application/wallet.service.js";
import { listAuditEventsForSecurity } from "../application/audit.service.js";
import { DomainError, forbidden, invalidInput, notFound } from "../domain/errors.js";
import { isMonthKey } from "../domain/period.js";
import { pingDb, type Db } from "../infrastructure/db/pool.js";

const MAX_JSON_BYTES = 16_384;
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;
const MAX_CURSOR_LENGTH = 512;

export interface CoreActor {
  userId: number;
  role: "user" | "admin" | "security";
}

export interface CoreApiDependencies {
  db: Db;
  allowedOrigins: ReadonlySet<string>;
  resolveSession(request: Request): Promise<CoreActor | null>;
  verifyCsrf(request: Request, actor: CoreActor): Promise<boolean>;
}

interface ApiFailure {
  success: false;
  data: null;
  error: { code: string; message: string };
  meta: null;
}

class HttpApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "HttpApiError";
    this.status = status;
    this.code = code;
  }
}

export async function handleCoreRequest(request: Request, deps: CoreApiDependencies): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  try {
    if (path === "/health" && request.method === "GET") {
      return success({ status: "pass", timestamp: new Date().toISOString() });
    }

    const actor = await deps.resolveSession(request);
    if (actor === null || !isTrustedActor(actor)) {
      throw new HttpApiError(401, "UNAUTHORIZED", "authentication required");
    }

    if (isMutation(request.method)) {
      await requireOriginAndCsrf(request, actor, deps);
      rejectQueryParameters(url, []);
    }

    if (path === "/health/ready" && request.method === "GET") {
      try {
        await pingDb(deps.db);
        return success({ status: "pass", checks: { database: "pass" } });
      } catch {
        return failure(503, "SERVICE_UNAVAILABLE", "dependency unavailable");
      }
    }

    if (path === "/admin/audit-logs" && request.method === "GET") {
      if (actor.role !== "security") throw forbidden();
      rejectQueryParameters(url, ["cursor", "limit"]);
      const page = readPageOptions(url);
      const result = await listAuditEventsForSecurity(deps.db, actor, page.cursor, page.limit);
      return success(result.data, 200, result.meta);
    }

    if (path === "/wallet" && request.method === "GET") {
      rejectQueryParameters(url, []);
      const wallet = await getWallet(deps.db, actor.userId);
      if (wallet === null) throw notFound();
      return success(wallet);
    }

    if (path === "/wallet/baseline" && request.method === "POST") {
      const body = await readJsonObject(request);
      assertOnlyKeys(body, ["initialBalanceVnd"]);
      const initialBalanceVnd = nonNegativeInteger(body["initialBalanceVnd"], "initialBalanceVnd");
      const idempotencyKey = requireIdempotencyKey(request);
      const data = await initializeWallet(deps.db, {
        userId: actor.userId,
        initialBalanceVnd,
        idempotencyKey,
        requestHash: canonicalHash({ initialBalanceVnd }),
      });
      return success(data, 201);
    }

    if (path === "/ledger/transactions" && request.method === "GET") {
      rejectQueryParameters(url, ["cursor", "limit", "type", "categoryId", "from", "to"]);
      const page = readPageOptions(url);
      const type = optionalEnum(url, "type", ["income", "payment"] as const);
      const categoryIdText = optionalQueryValue(url, "categoryId");
      const from = optionalInstant(url, "from");
      const to = optionalInstant(url, "to");
      if (from !== undefined && to !== undefined && Date.parse(from) > Date.parse(to)) {
        throw invalidInput("from must not be later than to");
      }
      const data = await listTransactions(deps.db, actor.userId, {
        ...page,
        ...(type === undefined ? {} : { type }),
        ...(categoryIdText === undefined ? {} : { categoryId: positiveId(categoryIdText, "categoryId") }),
        ...(from === undefined ? {} : { from }),
        ...(to === undefined ? {} : { to }),
      });
      return success(data.data, 200, data.meta);
    }

    if (path === "/ledger/transactions" && request.method === "POST") {
      const body = await readJsonObject(request);
      assertOnlyKeys(body, ["type", "amountVnd", "categoryId", "occurredAt", "description", "confirmedCategorySuggestion"]);
      const type = enumValue(body["type"], ["income", "payment"] as const, "type");
      const amountVnd = positiveInteger(body["amountVnd"], "amountVnd");
      const categoryId = positiveId(body["categoryId"], "categoryId");
      const occurredAt = requiredInstant(body["occurredAt"], "occurredAt");
      const description = optionalString(body, "description", 500) ?? null;
      const confirmedCategorySuggestion = optionalBoolean(body, "confirmedCategorySuggestion") ?? false;
      const idempotencyKey = requireIdempotencyKey(request);
      const hashBody = { type, amountVnd, categoryId: String(categoryId), occurredAt, description, confirmedCategorySuggestion };
      const data = await createTransaction(deps.db, {
        userId: actor.userId,
        type,
        amountVnd,
        categoryId,
        occurredAt,
        description,
        idempotencyKey,
        requestHash: canonicalHash(hashBody),
      });
      return success(data, 201);
    }

    const correctionMatch = /^\/ledger\/transactions\/([^/]+)\/corrections$/.exec(path);
    if (correctionMatch !== null && request.method === "POST") {
      const targetId = positiveId(correctionMatch[1], "transactionId");
      const body = await readJsonObject(request);
      assertOnlyKeys(body, ["correctionRole", "reason", "newAmountVnd", "newCategoryId"]);
      const role = enumValue(body["correctionRole"], ["reversal", "adjustment", "replacement"] as const, "correctionRole");
      const reason = requiredString(body, "reason", 1000);
      const newAmountVnd = body["newAmountVnd"] === undefined ? null : positiveInteger(body["newAmountVnd"], "newAmountVnd");
      const newCategoryId = body["newCategoryId"] === undefined ? null : positiveId(body["newCategoryId"], "newCategoryId");
      const idempotencyKey = requireIdempotencyKey(request);
      const data = await createCorrection(deps.db, {
        userId: actor.userId,
        targetId,
        role,
        reason,
        newAmountVnd,
        newCategoryId,
        idempotencyKey,
        requestHash: canonicalHash({ targetId, role, reason, newAmountVnd, newCategoryId }),
      });
      return success(data, 201);
    }

    const transactionMatch = /^\/ledger\/transactions\/([^/]+)$/.exec(path);
    if (transactionMatch !== null && request.method === "GET") {
      rejectQueryParameters(url, []);
      const transaction = await getTransaction(deps.db, actor.userId, positiveId(transactionMatch[1], "transactionId"));
      if (transaction === null) throw notFound();
      return success(transaction);
    }

    if (path === "/savings" && request.method === "GET") {
      rejectQueryParameters(url, []);
      const savings = await getSavings(deps.db, actor.userId);
      if (savings === null) throw notFound();
      return success(savings);
    }

    if (path === "/savings/transfers" && request.method === "GET") {
      rejectQueryParameters(url, ["cursor", "limit"]);
      const page = readPageOptions(url);
      const transfers = await listTransfers(deps.db, actor.userId, page.cursor, page.limit);
      return success(transfers.data, 200, transfers.meta);
    }

    if (path === "/savings/transfers" && request.method === "POST") {
      const body = await readJsonObject(request);
      assertOnlyKeys(body, ["direction", "amountVnd", "note"]);
      const direction = enumValue(body["direction"], ["deposit", "withdraw"] as const, "direction");
      const amountVnd = positiveInteger(body["amountVnd"], "amountVnd");
      const note = optionalString(body, "note", 500) ?? null;
      const idempotencyKey = requireIdempotencyKey(request);
      const data = await createTransfer(deps.db, {
        userId: actor.userId,
        direction,
        amountVnd,
        note,
        idempotencyKey,
        requestHash: canonicalHash({ direction, amountVnd, note }),
      });
      return success(data, 201);
    }

    if (path === "/categories" && request.method === "GET") {
      rejectQueryParameters(url, ["appliesTo", "includeDisabled"]);
      const appliesTo = optionalEnum(url, "appliesTo", ["income", "payment"] as const);
      const includeDisabledText = optionalQueryValue(url, "includeDisabled");
      if (includeDisabledText !== undefined && includeDisabledText !== "true" && includeDisabledText !== "false") {
        throw invalidInput("includeDisabled must be true or false");
      }
      const categories = await listUserCategories(deps.db, actor.userId, {
        ...(appliesTo === undefined ? {} : { appliesTo }),
        ...(includeDisabledText === undefined ? {} : { includeDisabled: includeDisabledText === "true" }),
      });
      return success(categories);
    }

    if (path === "/categories" && request.method === "POST") {
      const body = await readJsonObject(request);
      assertOnlyKeys(body, ["nameEn", "nameVi", "appliesTo"]);
      const nameEn = requiredString(body, "nameEn", 80);
      const nameVi = optionalString(body, "nameVi", 80) ?? "";
      const appliesTo = enumValue(body["appliesTo"], ["income", "payment"] as const, "appliesTo");
      const idempotencyKey = requireIdempotencyKey(request);
      const category = await createCustomCategory(deps.db, {
        userId: actor.userId,
        nameEn,
        nameVi,
        appliesTo,
        idempotencyKey,
        requestHash: canonicalHash({ nameEn, nameVi, appliesTo }),
      });
      if (category === null) throw new HttpApiError(409, "CATEGORY_CONFLICT", "category name already exists");
      return success(category, 201);
    }

    const categoryMatch = /^\/categories\/([^/]+)$/.exec(path);
    if (categoryMatch !== null && request.method === "PATCH") {
      const categoryId = positiveId(categoryMatch[1], "categoryId");
      const body = await readJsonObject(request);
      assertOnlyKeys(body, ["nameEn", "nameVi", "status"]);
      if (Object.keys(body).length === 0) throw invalidInput("at least one category field is required");
      const nameEn = optionalString(body, "nameEn", 80);
      const nameVi = optionalString(body, "nameVi", 80);
      if (nameEn === "") throw invalidInput("nameEn must not be empty");
      const status = body["status"] === undefined ? undefined : enumValue(body["status"], ["active", "disabled", "retired"] as const, "status");
      const category = await updateUserCategory(deps.db, {
        userId: actor.userId,
        categoryId,
        ...(nameEn === undefined ? {} : { nameEn }),
        ...(nameVi === undefined ? {} : { nameVi }),
        ...(status === undefined ? {} : { status }),
      });
      return success(category);
    }

    if (path === "/budgets" && request.method === "GET") {
      rejectQueryParameters(url, ["month"]);
      const month = requiredMonth(url);
      return success(await listMonthBudgets(deps.db, actor.userId, month));
    }

    if (path === "/budgets/summary" && request.method === "GET") {
      rejectQueryParameters(url, ["month"]);
      const month = requiredMonth(url);
      return success(await monthBudgetSummary(deps.db, actor.userId, month));
    }

    const budgetMatch = /^\/budgets\/([^/]+)$/.exec(path);
    if (budgetMatch !== null && request.method === "PUT") {
      const categoryId = positiveId(budgetMatch[1], "categoryId");
      const body = await readJsonObject(request);
      assertOnlyKeys(body, ["month", "limitVnd"]);
      const month = monthValue(body["month"]);
      const limitVnd = nonNegativeInteger(body["limitVnd"], "limitVnd");
      const idempotencyKey = requireIdempotencyKey(request);
      const budget = await upsertUserBudget(deps.db, {
        userId: actor.userId,
        categoryId,
        month,
        limitVnd,
        idempotencyKey,
        requestHash: canonicalHash({ categoryId, month, limitVnd }),
      });
      return success(budget);
    }

    if (path === "/reports/monthly" && request.method === "GET") {
      rejectQueryParameters(url, ["month"]);
      return success(await monthlyReport(deps.db, actor.userId, requiredMonth(url)));
    }

    if (path === "/reports/dashboard" && request.method === "GET") {
      rejectQueryParameters(url, []);
      return success(await dashboard(deps.db, actor.userId));
    }

    if (isKnownCorePath(path)) throw new HttpApiError(405, "METHOD_NOT_ALLOWED", "method not allowed");
    throw new HttpApiError(404, "NOT_FOUND", "resource not found");
  } catch (error) {
    if (error instanceof DomainError) return failure(error.status, error.code, error.message);
    if (error instanceof HttpApiError) return failure(error.status, error.code, error.message);
    return failure(500, "INTERNAL_ERROR", "internal server error");
  }
}

async function requireOriginAndCsrf(request: Request, actor: CoreActor, deps: CoreApiDependencies): Promise<void> {
  const originHeader = request.headers.get("origin");
  const referer = request.headers.get("referer");
  let origin = originHeader;
  if (origin === null && referer !== null) {
    try {
      origin = new URL(referer).origin;
    } catch {
      origin = null;
    }
  }
  if (origin === null || !deps.allowedOrigins.has(origin)) {
    throw new HttpApiError(403, "CSRF_INVALID", "request origin is not allowed");
  }
  if (!(await deps.verifyCsrf(request, actor))) {
    throw new HttpApiError(403, "CSRF_INVALID", "CSRF validation failed");
  }
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new HttpApiError(415, "UNSUPPORTED_MEDIA_TYPE", "application/json required");
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) throw invalidInput("invalid content-length");
    if (Number(contentLength) > MAX_JSON_BYTES) {
      throw new HttpApiError(413, "REQUEST_TOO_LARGE", "request body exceeds the allowed size");
    }
  }
  if (request.body === null) throw invalidInput("JSON request body required");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    size += result.value.byteLength;
    if (size > MAX_JSON_BYTES) {
      await reader.cancel();
      throw new HttpApiError(413, "REQUEST_TOO_LARGE", "request body exceeds the allowed size");
    }
    chunks.push(result.value);
  }

  let parsed: unknown;
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw invalidInput("malformed JSON body");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw invalidInput("JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

function rejectQueryParameters(url: URL, allowed: readonly string[]): void {
  const seen = new Set<string>();
  for (const key of url.searchParams.keys()) {
    if (!allowed.includes(key)) throw invalidInput(`unexpected query parameter: ${key}`);
    if (seen.has(key)) throw invalidInput(`query parameter must not repeat: ${key}`);
    seen.add(key);
  }
}

function readPageOptions(url: URL): { cursor?: string; limit: number } {
  const cursor = optionalQueryValue(url, "cursor");
  if (cursor !== undefined && (cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH)) {
    throw invalidInput(`cursor must contain at most ${MAX_CURSOR_LENGTH} characters`);
  }
  const limitText = optionalQueryValue(url, "limit");
  if (limitText === undefined) return cursor === undefined ? { limit: DEFAULT_PAGE_LIMIT } : { cursor, limit: DEFAULT_PAGE_LIMIT };
  if (!/^\d+$/.test(limitText)) throw invalidInput("limit must be an integer from 1 to 100");
  const limit = Number(limitText);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_LIMIT) {
    throw invalidInput("limit must be an integer from 1 to 100");
  }
  return cursor === undefined ? { limit } : { cursor, limit };
}

function requiredMonth(url: URL): string {
  return monthValue(optionalQueryValue(url, "month"));
}

function monthValue(value: unknown): string {
  if (!isMonthKey(value)) throw invalidInput("month must be YYYY-MM");
  return value;
}

function optionalInstant(url: URL, key: string): string | undefined {
  const value = optionalQueryValue(url, key);
  if (value === undefined) return undefined;
  return instantValue(value, key);
}

function requiredInstant(value: unknown, name: string): string {
  if (typeof value !== "string") throw invalidInput(`${name} must be an ISO-8601 instant`);
  return instantValue(value, name);
}

function instantValue(value: string, name: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (match === null || !Number.isFinite(Date.parse(value))) {
    throw invalidInput(`${name} must be an ISO-8601 instant`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw invalidInput(`${name} must be an ISO-8601 instant`);
  }
  return value;
}

function optionalEnum<const T extends readonly string[]>(url: URL, key: string, values: T): T[number] | undefined {
  const value = optionalQueryValue(url, key);
  return value === undefined ? undefined : enumValue(value, values, key);
}

function optionalQueryValue(url: URL, key: string): string | undefined {
  const values = url.searchParams.getAll(key);
  if (values.length > 1) throw invalidInput(`query parameter must not repeat: ${key}`);
  return values[0];
}

function requireIdempotencyKey(request: Request): string {
  const key = request.headers.get("idempotency-key");
  if (key === null || key.trim().length === 0 || key.trim() !== key || key.length > 255) {
    throw invalidInput("Idempotency-Key header is required (max 255 characters)");
  }
  return key;
}

function requiredString(body: Record<string, unknown>, key: string, maxLength: number): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw invalidInput(`${key} is required (max ${maxLength} characters)`);
  }
  return value;
}

function optionalString(body: Record<string, unknown>, key: string, maxLength: number): string | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maxLength) throw invalidInput(`${key} must be a string (max ${maxLength} characters)`);
  return value;
}

function optionalBoolean(body: Record<string, unknown>, key: string): boolean | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw invalidInput(`${key} must be a boolean`);
  return value;
}

function positiveInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw invalidInput(`${name} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw invalidInput(`${name} must be a non-negative integer`);
  }
  return value;
}

function positiveId(value: unknown, name: string): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) throw invalidInput(`${name} must be a positive integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw invalidInput(`${name} must be a positive integer`);
  return parsed;
}

function enumValue<const T extends readonly string[]>(value: unknown, values: T, name: string): T[number] {
  if (typeof value !== "string" || !values.includes(value)) throw invalidInput(`invalid ${name}`);
  return value as T[number];
}

function assertOnlyKeys(body: Record<string, unknown>, allowed: readonly string[]): void {
  const unexpected = Object.keys(body).find((key) => !allowed.includes(key));
  if (unexpected !== undefined) throw invalidInput(`unexpected field: ${unexpected}`);
}

function isTrustedActor(actor: CoreActor): boolean {
  return Number.isSafeInteger(actor.userId) && actor.userId > 0 &&
    (actor.role === "user" || actor.role === "admin" || actor.role === "security");
}

function isMutation(method: string): boolean {
  return method === "POST" || method === "PATCH" || method === "PUT";
}

function isKnownCorePath(path: string): boolean {
  return path === "/wallet" || path === "/wallet/baseline" || path === "/ledger/transactions" ||
    path.startsWith("/ledger/transactions/") || path === "/savings" || path === "/savings/transfers" ||
    path === "/categories" || path.startsWith("/categories/") || path === "/budgets" ||
    path === "/budgets/summary" || path.startsWith("/budgets/") || path === "/reports/monthly" ||
    path === "/reports/dashboard" || path === "/admin/audit-logs" || path === "/health" || path === "/health/ready";
}

function success<T>(data: T, status = 200, meta: unknown = null): Response {
  return jsonResponse({ success: true, data, error: null, meta }, status);
}

function failure(status: number, code: string, message: string): Response {
  const body: ApiFailure = { success: false, data: null, error: { code, message }, meta: null };
  return jsonResponse(body, status);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store, private" },
  });
}
