import { test } from "node:test";
import assert from "node:assert/strict";
import { handleIssueRequest } from "../src/api/issue-routes.js";
import type { Db } from "../src/infrastructure/db/pool.js";

const noDb = {} as Db;

function dependencies(options: {
  actor?: { userId: number; role: "user" | "admin" | "security" } | null;
  csrfValid?: boolean;
  allowedOrigins?: ReadonlySet<string>;
} = {}) {
  let csrfChecks = 0;
  return {
    csrfChecks: () => csrfChecks,
    value: {
      db: noDb,
      allowedOrigins: options.allowedOrigins ?? new Set(["https://campus.example"]),
      resolveSession: async () => options.actor === undefined ? { userId: 7, role: "user" as const } : options.actor,
      verifyCsrf: async () => {
        csrfChecks += 1;
        return options.csrfValid ?? true;
      },
    },
  };
}

async function body(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>;
}

test("issue HTTP boundary returns a private 401 envelope without a session", async () => {
  const deps = dependencies({ actor: null });
  const response = await handleIssueRequest(new Request("https://campus.example/issues/me"), deps.value);

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  assert.deepEqual(await body(response), {
    success: false,
    data: null,
    error: { code: "UNAUTHORIZED", message: "authentication required" },
    meta: null,
  });
});

test("issue mutations reject an untrusted origin before CSRF validation", async () => {
  const deps = dependencies({ allowedOrigins: new Set(["https://campus.example"]) });
  const response = await handleIssueRequest(new Request("https://campus.example/issues", {
    method: "POST",
    headers: { origin: "https://attacker.example", "content-type": "application/json" },
    body: JSON.stringify({ title: "Issue", description: "Details", category: "bug" }),
  }), deps.value);

  assert.equal(response.status, 403);
  assert.equal(deps.csrfChecks(), 0);
  const result = await body(response);
  assert.equal((result.error as { code: string }).code, "CSRF_INVALID");
});

test("issue routes reject non-admin access, malformed JSON, and oversized bodies", async () => {
  const deps = dependencies();
  const adminResponse = await handleIssueRequest(new Request("https://campus.example/admin/issues"), deps.value);
  assert.equal(adminResponse.status, 403);

  const malformedResponse = await handleIssueRequest(new Request("https://campus.example/issues", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json", "idempotency-key": "key" },
    body: "{",
  }), deps.value);
  assert.equal(malformedResponse.status, 422);
  assert.equal(((await body(malformedResponse)).error as { code: string }).code, "INVALID_INPUT");

  const oversizedResponse = await handleIssueRequest(new Request("https://campus.example/issues", {
    method: "POST",
    headers: {
      origin: "https://campus.example",
      "content-type": "application/json",
      "content-length": "20000",
      "idempotency-key": "key",
    },
    body: JSON.stringify({ title: "Issue", description: "Details", category: "bug" }),
  }), deps.value);
  assert.equal(oversizedResponse.status, 413);
});
