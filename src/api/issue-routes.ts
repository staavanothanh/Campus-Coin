import { invalidInput, forbidden } from '../domain/errors.ts';
import type { Db } from '../infrastructure/db/pool.ts';
import {
  addAdminIssueNote,
  createUserIssue,
  getIssueForAdmin,
  listAllIssuesForAdmin,
  listUserIssues,
  updateIssueForAdmin,
  type IssueActor,
  type IssuePageOptions,
} from '../application/issue.service.ts';

export type IssueRouteDependencies = {
  db: Db;
  actor: IssueActor;
  idempotencyKey: string;
  requestHash(value: unknown): string;
};
export async function handleIssueRoute(
  method: string,
  path: string,
  url: URL,
  body: Record<string, unknown>,
  dependencies: IssueRouteDependencies,
): Promise<{ status: number; body: unknown } | null> {
  const { db, actor } = dependencies;
  if (path === "/admin/issues" || path.startsWith("/admin/issues/")) {
    if (actor.role !== "admin") throw forbidden();
  }
  if (method === "GET" && path === "/issues/me") {
    return { status: 200, body: await listUserIssues(db, actor.userId, readPageQuery(url)) };
  }
  if (method === "POST" && path === "/issues") {
    const relatedTransactionId = optionalPositiveId(body["relatedTransactionId"]);
    const title = requiredString(body["title"], "title", 160);
    const description = requiredString(body["description"], "description", 4000);
    const category = enumValue(body["category"], ["financial_dispute", "bug", "other"] as const, "category");
    const issue = await createUserIssue(db, {
      userId: actor.userId, relatedTransactionId, title, description, category,
      idempotencyKey: dependencies.idempotencyKey,
      requestHash: dependencies.requestHash({ title, description, category, relatedTransactionId }),
    });
    return { status: 201, body: { data: issue } };
  }
  if (method === "GET" && path === "/admin/issues") {
    return { status: 200, body: await listAllIssuesForAdmin(db, actor, readPageQuery(url, true)) };
  }
  const noteMatch = /^\/admin\/issues\/([1-9]\d*)\/notes$/.exec(path);
  if (noteMatch !== null && method === "POST") {
    const issueId = positiveId(noteMatch[1], "issueId");
    const noteText = requiredString(body["note"], "note", 4000);
    const note = await addAdminIssueNote(db, {
      actor, issueId, note: noteText, idempotencyKey: dependencies.idempotencyKey,
      requestHash: dependencies.requestHash({ issueId, note: noteText }),
    });
    return { status: 201, body: { data: note } };
  }
  const issueMatch = /^\/admin\/issues\/([1-9]\d*)$/.exec(path);
  if (issueMatch !== null && method === "GET") {
    return { status: 200, body: { data: await getIssueForAdmin(db, actor, positiveId(issueMatch[1], "issueId")) } };
  }
  if (issueMatch !== null && method === "PATCH") {
    const patch = readAdminPatch(body);
    return { status: 200, body: { data: await updateIssueForAdmin(db, { actor, issueId: positiveId(issueMatch[1], "issueId"), ...patch }) } };
  }
  if (path === "/issues" || path === "/issues/me" || path.startsWith("/admin/issues")) {
    throw invalidInput("method not allowed");
  }
  return null;
}

function readPageQuery(url: URL, includeFilters = false): IssuePageOptions {
  const limitText = url.searchParams.get("limit");
  const limit = limitText === null ? undefined : Number(limitText);
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)) throw invalidInput("invalid issue limit");
  const cursor = url.searchParams.get("cursor") ?? undefined;
  if (cursor !== undefined && (cursor.length === 0 || cursor.length > 512)) throw invalidInput("invalid issue cursor");
  const statusText = url.searchParams.get("status");
  const priorityText = url.searchParams.get("priority");
  if (!includeFilters && (statusText !== null || priorityText !== null)) throw invalidInput("admin filters are not allowed");
  return {
    ...(limit === undefined ? {} : { limit }),
    ...(cursor === undefined ? {} : { cursor }),
    ...(includeFilters && statusText !== null ? { status: enumValue(statusText, ["open", "in_triage", "resolved", "closed"] as const, "status") } : {}),
    ...(includeFilters && priorityText !== null ? { priority: enumValue(priorityText, ["P0", "P1", "P2"] as const, "priority") } : {}),
  };
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) throw invalidInput(`invalid ${field}`);
  return value;
}

function optionalPositiveId(value: unknown): number | null {
  if (value === undefined) return null;
  return positiveId(value, "relatedTransactionId");
}

function positiveId(value: unknown, field: string): number {
  const id = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  if (!Number.isSafeInteger(id) || id < 1) throw invalidInput(`invalid ${field}`);
  return id;
}

function enumValue<const T extends readonly string[]>(value: unknown, values: T, field: string): T[number] {
  if (typeof value !== "string" || !values.includes(value)) throw invalidInput(`invalid ${field}`);
  return value as T[number];
}

function readAdminPatch(body: Record<string, unknown>): { status?: "open" | "in_triage" | "resolved" | "closed"; priority?: "P0" | "P1" | "P2" } {
  const unexpected = Object.keys(body).find(key => key !== "status" && key !== "priority");
  if (unexpected !== undefined) throw invalidInput("unexpected admin issue field");
  const status = body["status"] === undefined ? undefined : enumValue(body["status"], ["open", "in_triage", "resolved", "closed"] as const, "status");
  const priority = body["priority"] === undefined ? undefined : enumValue(body["priority"], ["P0", "P1", "P2"] as const, "priority");
  if (status === undefined && priority === undefined) throw invalidInput("issue patch is empty");
  return { ...(status === undefined ? {} : { status }), ...(priority === undefined ? {} : { priority }) };
}
