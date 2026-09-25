import { canonicalHash } from "../lib/hash.ts";
import { DomainError, forbidden, invalidInput } from "../domain/errors.ts";
import type { Db } from "../infrastructure/db/pool.ts";
import {
  addAdminIssueNote,
  createUserIssue,
  getIssueForAdmin,
  listAllIssuesForAdmin,
  listIssueEventsForAdmin,
  listUserIssues,
  updateIssueForAdmin,
  type IssueActor,
  type IssuePageOptions,
} from "../application/issue.service.ts";

const MAX_JSON_BYTES = 16_384;

export interface IssueApiDependencies {
  db: Db;
  allowedOrigins: ReadonlySet<string>;
  resolveSession(request: Request): Promise<IssueActor | null>;
  verifyCsrf(request: Request, actor: IssueActor): Promise<boolean>;
}

interface ApiError {
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

export async function handleIssueRequest(request: Request, dependencies: IssueApiDependencies): Promise<Response> {
  try {
    const actor = await dependencies.resolveSession(request);
    if (actor === null) throw new HttpApiError(401, "UNAUTHORIZED", "authentication required");
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";
    if (path.startsWith("/admin/") && actor.role !== "admin") throw forbidden();
    const mutation = request.method === "POST" || request.method === "PATCH";
    if (mutation) await requireCsrf(request, actor, dependencies);

    if (path === "/issues" && request.method === "POST") {
      const body = await readJsonObject(request);
      assertOnlyKeys(body, ["title", "description", "category", "relatedTransactionId"]);
      const title = requiredString(body, "title", 160);
      const description = requiredString(body, "description", 4000);
      const category = enumString(body, "category", ["financial_dispute", "bug", "other"] as const);
      const relatedTransactionId = body["relatedTransactionId"] === undefined
        ? null
        : positiveId(body["relatedTransactionId"], "relatedTransactionId");
      const idempotencyKey = requireIdempotencyKey(request);
      const data = await createUserIssue(dependencies.db, {
        userId: actor.userId,
        relatedTransactionId,
        title,
        description,
        category,
        idempotencyKey,
        requestHash: canonicalHash({ title, description, category, relatedTransactionId }),
      });
      return successResponse({ success: true, data, meta: null }, 201);
    }

    if (path === "/issues/me" && request.method === "GET") {
      const page = await listUserIssues(dependencies.db, actor.userId, readPageOptions(url));
      return successResponse({ success: true, data: page.data, meta: page.meta });
    }

    if (path === "/admin/issues" && request.method === "GET") {
      const page = await listAllIssuesForAdmin(dependencies.db, actor, readPageOptions(url, true));
      return successResponse({ success: true, data: page.data, meta: page.meta });
    }

    const noteMatch = /^\/admin\/issues\/([1-9]\d*)\/notes$/.exec(path);
    if (noteMatch !== null && request.method === "POST") {
      const issueId = positiveId(noteMatch[1], "issueId");
      const body = await readJsonObject(request);
      assertOnlyKeys(body, ["note"]);
      const noteText = requiredString(body, "note", 4000);
      const idempotencyKey = requireIdempotencyKey(request);
      const event = await addAdminIssueNote(dependencies.db, {
        actor,
        issueId,
        note: noteText,
        idempotencyKey,
        requestHash: canonicalHash({ issueId, note: noteText }),
      });
      return successResponse({
        success: true,
        data: { id: String(event.id), createdAt: event.createdAt },
        meta: null,
      }, 201);
    }

    const adminMatch = /^\/admin\/issues\/([1-9]\d*)$/.exec(path);
    if (adminMatch !== null && request.method === "GET") {
      const issueId = positiveId(adminMatch[1], "issueId");
      const [issue, events] = await Promise.all([
        getIssueForAdmin(dependencies.db, actor, issueId),
        listIssueEventsForAdmin(dependencies.db, actor, issueId),
      ]);
      return successResponse({
        success: true,
        data: {
          ...issue,
          events: events.map(({ id, kind, note, createdAt }) => ({ id: String(id), kind, note, createdAt })),
        },
        meta: null,
      });
    }

    if (adminMatch !== null && request.method === "PATCH") {
      const issueId = positiveId(adminMatch[1], "issueId");
      const body = await readJsonObject(request);
      assertOnlyKeys(body, ["status", "priority"]);
      if (body["status"] === undefined && body["priority"] === undefined) {
        throw invalidInput("status or priority is required");
      }
      const status = body["status"] === undefined
        ? undefined
        : enumString(body, "status", ["open", "in_triage", "resolved", "closed"] as const);
      const priority = body["priority"] === undefined
        ? undefined
        : enumString(body, "priority", ["P0", "P1", "P2"] as const);
      const data = await updateIssueForAdmin(dependencies.db, {
        actor,
        issueId,
        ...(status === undefined ? {} : { status }),
        ...(priority === undefined ? {} : { priority }),
      });
      return successResponse({ success: true, data, meta: null });
    }

    if (path.startsWith("/admin/issues") && actor.role !== "admin") throw forbidden();
    if (path === "/issues" || path === "/issues/me" || path.startsWith("/admin/issues")) {
      throw new HttpApiError(405, "METHOD_NOT_ALLOWED", "method not allowed");
    }
    throw new HttpApiError(404, "NOT_FOUND", "resource not found");
  } catch (error) {
    const failure = toApiError(error);
    return successResponse(failure.body, failure.status);
  }
}

async function requireCsrf(
  request: Request,
  actor: IssueActor,
  dependencies: IssueApiDependencies,
): Promise<void> {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  let requestOrigin: string | null = origin;
  if (requestOrigin === null && referer !== null) {
    try {
      requestOrigin = new URL(referer).origin;
    } catch {
      requestOrigin = null;
    }
  }
  if (requestOrigin === null || !dependencies.allowedOrigins.has(requestOrigin)) {
    throw new HttpApiError(403, "CSRF_INVALID", "request origin is not allowed");
  }
  if (!(await dependencies.verifyCsrf(request, actor))) {
    throw new HttpApiError(403, "CSRF_INVALID", "CSRF validation failed");
  }
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new HttpApiError(415, "UNSUPPORTED_MEDIA_TYPE", "application/json required");
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > MAX_JSON_BYTES) {
    throw new HttpApiError(413, "REQUEST_TOO_LARGE", "request body exceeds the allowed size");
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

function readPageOptions(url: URL, includeAdminFilters = false): IssuePageOptions {
  const cursor = url.searchParams.get("cursor") ?? undefined;
  if (cursor !== undefined && cursor.length > 512) throw invalidInput("cursor exceeds 512 characters");
  const limitText = url.searchParams.get("limit");
  const limit = limitText === null ? undefined : Number(limitText);
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)) {
    throw invalidInput("limit must be an integer from 1 to 100");
  }
  const statusText = url.searchParams.get("status");
  const priorityText = url.searchParams.get("priority");
  if (!includeAdminFilters && (statusText !== null || priorityText !== null)) {
    throw invalidInput("status and priority filters are admin-only");
  }
  const status = statusText === null
    ? undefined
    : enumValue(statusText, ["open", "in_triage", "resolved", "closed"] as const, "status");
  const priority = priorityText === null
    ? undefined
    : enumValue(priorityText, ["P0", "P1", "P2"] as const, "priority");
  return {
    ...(cursor === undefined ? {} : { cursor }),
    ...(limit === undefined ? {} : { limit }),
    ...(status === undefined ? {} : { status }),
    ...(priority === undefined ? {} : { priority }),
  };
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

function enumString<const T extends readonly string[]>(body: Record<string, unknown>, key: string, values: T): T[number] {
  return enumValue(body[key], values, key);
}

function enumValue<const T extends readonly string[]>(value: unknown, values: T, key: string): T[number] {
  if (typeof value !== "string" || !values.includes(value)) throw invalidInput(`invalid ${key}`);
  return value as T[number];
}

function positiveId(value: unknown, name: string): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw invalidInput(`${name} must be a positive integer`);
  return parsed;
}

function assertOnlyKeys(body: Record<string, unknown>, allowed: readonly string[]): void {
  const unexpected = Object.keys(body).find((key) => !allowed.includes(key));
  if (unexpected !== undefined) throw invalidInput(`unexpected field: ${unexpected}`);
}

function successResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store, private" },
  });
}

function toApiError(error: unknown): { status: number; body: ApiError } {
  if (error instanceof DomainError) {
    return {
      status: error.status,
      body: { success: false, data: null, error: { code: error.code, message: error.message }, meta: null },
    };
  }
  if (error instanceof HttpApiError) {
    return {
      status: error.status,
      body: { success: false, data: null, error: { code: error.code, message: error.message }, meta: null },
    };
  }
  return {
    status: 500,
    body: { success: false, data: null, error: { code: "INTERNAL_ERROR", message: "internal server error" }, meta: null },
  };
}
