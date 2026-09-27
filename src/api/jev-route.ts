import { randomUUID } from "node:crypto";
import { listUserCategories } from "../application/category.service.ts";
import type { Db } from "../infrastructure/db/pool.ts";
import { DomainError, invalidInput } from "../domain/errors.ts";
import { redactJevDescription } from "../lib/jev-description.js";

const MAX_JSON_BYTES = 16_384;
const SAFE_CATEGORY_LABELS: Record<'income' | 'payment', Record<'en' | 'vi', readonly string[]>> = {
  income: {
    en: ['Salary', 'Allowance', 'Gift', 'Other income'],
    vi: ['Lương', 'Trợ cấp', 'Quà tặng', 'Khác'],
  },
  payment: {
    en: ['Food & Dining', 'Transport', 'Shopping', 'Entertainment', 'Education', 'Rent & Utilities', 'Other payment'],
    vi: ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Giải trí', 'Học tập', 'Nhà ở & Điện nước', 'Khác'],
  },
};

export type JevActor = { userId: number; role: "user" | "admin" | "security" };
export type JevResult =
  | { status: "suggested"; categoryId: string; confidence: number; reasonCode: null }
  | { status: "manual"; categoryId: null; confidence: number | null; reasonCode: "low_confidence" | "timeout" | "quota" | "schema" | "privacy" | null }
  | { status: "disabled"; categoryId: null; confidence: null; reasonCode: "flag_off" | null }
  | { status: "unavailable"; categoryId: null; confidence: null; reasonCode: null };

export type JevService = {
  suggest(input: {
    transactionType: "income" | "payment";
    descriptionRedacted: string;
    locale: "en" | "vi";
    candidates: Array<{ id: string; semanticLabel: string; active: true; appliesTo: Array<"income" | "payment"> }>;
  }): Promise<JevResult>;
};

const MAX_CONCURRENT_REQUESTS = 2;
const MAX_REQUESTS_PER_ACTOR = 20;
const actorRequestCounts = new Map<number, number>();
let activeRequests = 0;

function acquireBudget(userId: number): (() => void) | null {
  const count = actorRequestCounts.get(userId) ?? 0;
  if (count >= MAX_REQUESTS_PER_ACTOR || activeRequests >= MAX_CONCURRENT_REQUESTS) return null;
  actorRequestCounts.set(userId, count + 1);
  activeRequests += 1;
  return () => {
    activeRequests -= 1;
    const next = (actorRequestCounts.get(userId) ?? 1) - 1;
    if (next > 0) actorRequestCounts.set(userId, next);
    else actorRequestCounts.delete(userId);
  };
}
export async function handleJevSuggestion(
  request: Request,
  options: { db: Db; actor: JevActor; jevService?: JevService },
): Promise<Response> {
  const url = new URL(request.url);
  try {
    if (request.method !== "POST" || url.pathname !== "/ai/category-suggestion") {
      return failure(404, "NOT_FOUND", "resource not found");
    }
    if (url.search !== "") throw invalidInput("query parameters are not allowed");
    const body = await readJsonObject(request);
    assertOnlyKeys(body, ["transactionType", "description", "locale"]);
    const transactionType = enumValue(body["transactionType"], ["income", "payment"] as const);
    const description = requiredString(body["description"], 500);
    const descriptionRedacted = redactJevDescription(description);
    const locale = enumValue(body["locale"], ["en", "vi"] as const);
    if (descriptionRedacted === null) {
      return success({ status: "manual", categoryId: null, confidence: null, reasonCode: "privacy" });
    }
    if (options.jevService === undefined) {
      return success({ status: "disabled", categoryId: null, confidence: null, reasonCode: "flag_off" });
    }

    const releaseBudget = acquireBudget(options.actor.userId);
    if (releaseBudget === null) return success({ status: "unavailable", categoryId: null, confidence: null, reasonCode: null });
    try {
      const categories = await listUserCategories(options.db, options.actor.userId, { appliesTo: transactionType });
      const safeLabels = SAFE_CATEGORY_LABELS[transactionType][locale];
      if (categories.some(category => !category.isDefault || !safeLabels.includes(category.name[locale]))) {
        return success({ status: "manual", categoryId: null, confidence: null, reasonCode: "privacy" });
      }
      const candidates = categories.map(category => ({
        providerId: randomUUID(),
        categoryId: category.id,
        semanticLabel: category.name[locale],
        active: true as const,
        appliesTo: [category.appliesTo],
      }));
      let result: unknown;
      try {
        result = await options.jevService.suggest({
          transactionType,
          descriptionRedacted,
          locale,
          candidates: candidates.map(({ providerId, semanticLabel, active, appliesTo }) => ({
            id: providerId, semanticLabel, active, appliesTo,
          })),
        });
      } catch {
        return success({ status: "manual", categoryId: null, confidence: null, reasonCode: null });
      }
      if (!isJevResult(result)) return success({ status: "manual", categoryId: null, confidence: null, reasonCode: "schema" });
      if (result.status !== "suggested") return success(result);
      const selected = candidates.find(candidate => candidate.providerId === result.categoryId);
      if (selected === undefined) return success({ status: "manual", categoryId: null, confidence: null, reasonCode: "schema" });
      return success({ ...result, categoryId: String(selected.categoryId) });
    } finally {
      releaseBudget();
    }
  } catch (error) {
    if (error instanceof DomainError) return failure(error.status, error.code, error.message);
    if (error instanceof JevHttpError) return failure(error.status, error.code, error.message);
    return failure(500, "INTERNAL_ERROR", "internal server error");
  }
}

class JevHttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "JevHttpError";
    this.status = status;
    this.code = code;
  }
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new JevHttpError(415, "UNSUPPORTED_MEDIA_TYPE", "application/json required");
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_JSON_BYTES)) {
    throw new JevHttpError(413, "REQUEST_TOO_LARGE", "request body exceeds the allowed size");
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
      throw new JevHttpError(413, "REQUEST_TOO_LARGE", "request body exceeds the allowed size");
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
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw invalidInput("malformed JSON body");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw invalidInput("JSON body must be an object");
  return parsed as Record<string, unknown>;
}

function assertOnlyKeys(body: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(body).some(key => !allowed.includes(key))) throw invalidInput("unexpected field");
}

function requiredString(value: unknown, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) throw invalidInput("invalid description");
  return value;
}

function enumValue<const T extends readonly string[]>(value: unknown, values: T): T[number] {
  if (typeof value !== "string" || !values.includes(value)) throw invalidInput("invalid enum value");
  return value as T[number];
}

function isJevResult(value: unknown): value is JevResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  const confidenceValid = result["confidence"] === null ||
    (typeof result["confidence"] === "number" && Number.isFinite(result["confidence"]) && result["confidence"] >= 0 && result["confidence"] <= 1);
  if (!confidenceValid || !(result["categoryId"] === null || typeof result["categoryId"] === "string")) return false;
  if (result["status"] === "suggested") return typeof result["categoryId"] === "string" && typeof result["confidence"] === "number" && result["reasonCode"] === null;
  if (result["status"] === "manual") return result["categoryId"] === null;
  if (result["status"] === "disabled") return result["categoryId"] === null && result["confidence"] === null && result["reasonCode"] === "flag_off";
  return result["status"] === "unavailable" && result["categoryId"] === null && result["confidence"] === null && result["reasonCode"] === null;
}

function success(data: unknown): Response {
  return jsonResponse({ data }, 200);
}

function failure(status: number, code: string, message: string): Response {
  return jsonResponse({ error: { code, message } }, status);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store, private" },
  });
}
