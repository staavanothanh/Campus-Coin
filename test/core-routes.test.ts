import { test } from "node:test";
import assert from "node:assert/strict";
import { handleCoreRequest, type CoreActor, type CoreApiDependencies } from "../src/api/core-routes.js";
import { handleApiRequest } from "../src/api/handler.js";
import type { Db } from "../src/infrastructure/db/pool.js";

function dependencies(options: {
  actor?: CoreActor | null;
  csrfValid?: boolean;
  allowedOrigins?: ReadonlySet<string>;
  db?: Db;
} = {}) {
  let csrfChecks = 0;
  return {
    csrfChecks: () => csrfChecks,
    value: {
      db: options.db ?? ({} as Db),
      allowedOrigins: options.allowedOrigins ?? new Set(["https://campus.example"]),
      resolveSession: async () => options.actor === undefined ? { userId: 73, role: "user" as const } : options.actor,
      verifyCsrf: async () => {
        csrfChecks += 1;
        return options.csrfValid ?? true;
      },
    } satisfies CoreApiDependencies,
  };
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>;
}

test("core routes return a private unauthorized envelope without a session", async () => {
  const deps = dependencies({ actor: null });
  const response = await handleCoreRequest(new Request("https://campus.example/wallet"), deps.value);

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  assert.deepEqual(await responseBody(response), {
    success: false,
    data: null,
    error: { code: "UNAUTHORIZED", message: "authentication required" },
    meta: null,
  });
});

test("shared API entrypoint dispatches issue routes and exposes only the documented public liveness route", async () => {
  const deps = dependencies({ actor: null });
  const healthResponse = await handleApiRequest(new Request("https://campus.example/health"), deps.value);
  const issueResponse = await handleApiRequest(new Request("https://campus.example/issues/me"), deps.value);

  assert.equal(healthResponse.status, 200);
  assert.equal(issueResponse.status, 401);
  assert.equal(((await responseBody(issueResponse)).error as { code: string }).code, "UNAUTHORIZED");
});

test("core mutations reject an untrusted Origin before CSRF validation", async () => {
  const deps = dependencies();
  const response = await handleCoreRequest(new Request("https://campus.example/wallet/baseline", {
    method: "POST",
    headers: { origin: "https://attacker.example", "content-type": "application/json" },
    body: JSON.stringify({ initialBalanceVnd: 1000 }),
  }), deps.value);

  assert.equal(response.status, 403);
  assert.equal(deps.csrfChecks(), 0);
  assert.equal(((await responseBody(response)).error as { code: string }).code, "CSRF_INVALID");
});

test("core mutations invoke CSRF only after an allowed Origin", async () => {
  const deps = dependencies({ csrfValid: false });
  const response = await handleCoreRequest(new Request("https://campus.example/wallet/baseline", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ initialBalanceVnd: 1000 }),
  }), deps.value);

  assert.equal(response.status, 403);
  assert.equal(deps.csrfChecks(), 1);
});

test("core routes reject unknown owner fields and oversized JSON before database access", async () => {
  let databaseCalls = 0;
  const db = {
    query: async () => {
      databaseCalls += 1;
      throw new Error("unexpected database call");
    },
  } as unknown as Db;
  const deps = dependencies({ db });
  const unknownFieldResponse = await handleCoreRequest(new Request("https://campus.example/wallet/baseline", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json", "idempotency-key": "baseline-1" },
    body: JSON.stringify({ userId: 7, initialBalanceVnd: 1000 }),
  }), deps.value);
  assert.equal(unknownFieldResponse.status, 422);
  assert.equal(((await responseBody(unknownFieldResponse)).error as { code: string }).code, "INVALID_INPUT");

  const oversizedResponse = await handleCoreRequest(new Request("https://campus.example/wallet/baseline", {
    method: "POST",
    headers: {
      origin: "https://campus.example",
      "content-type": "application/json",
      "content-length": "20000",
      "idempotency-key": "baseline-2",
    },
    body: JSON.stringify({ initialBalanceVnd: 1000 }),
  }), deps.value);
  assert.equal(oversizedResponse.status, 413);

  const streamedOversizedResponse = await handleCoreRequest(new Request("https://campus.example/wallet/baseline", {
    method: "POST",
    headers: {
      origin: "https://campus.example",
      "content-type": "application/json",
      "idempotency-key": "baseline-3",
    },
    body: `{"initialBalanceVnd":1000,"padding":"${"x".repeat(17_000)}"}`,
  }), deps.value);
  assert.equal(streamedOversizedResponse.status, 413);
  assert.equal(databaseCalls, 0);
});

test("wallet reads use the trusted session owner rather than request data", async () => {
  const receivedParameters: unknown[][] = [];
  const db = {
    query: async (_sql: string, parameters?: unknown[]) => {
      receivedParameters.push(parameters ?? []);
      return [[{
        id: 1,
        user_id: 73,
        initialized: 1,
        initial_balance_vnd: 0,
        available_balance_vnd: 0,
        currency: "VND",
        updated_at: new Date("2026-09-01T00:00:00.000Z"),
      }], []];
    },
  } as unknown as Db;
  const deps = dependencies({ db, actor: { userId: 73, role: "user" } });
  const response = await handleCoreRequest(new Request("https://campus.example/wallet?userId=7"), deps.value);

  assert.equal(response.status, 422);
  assert.deepEqual(receivedParameters, []);

  const trustedResponse = await handleCoreRequest(new Request("https://campus.example/wallet"), deps.value);
  assert.equal(trustedResponse.status, 200);
  assert.deepEqual(receivedParameters, [[73]]);
  assert.deepEqual(await responseBody(trustedResponse), {
    success: true,
    data: {
      walletId: "1",
      initialized: true,
      initialBalanceVnd: 0,
      availableBalanceVnd: 0,
      currency: "VND",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
    error: null,
    meta: null,
  });
});

test("core routes bound page limits and cursor lengths", async () => {
  const deps = dependencies();
  const invalidLimit = await handleCoreRequest(new Request("https://campus.example/savings/transfers?limit=101"), deps.value);
  const invalidCursor = await handleCoreRequest(new Request(`https://campus.example/ledger/transactions?cursor=${"x".repeat(513)}`), deps.value);

  assert.equal(invalidLimit.status, 422);
  assert.equal(invalidCursor.status, 422);
});

test("core mutation rejects impossible calendar dates before reaching the service", async () => {
  const deps = dependencies();
  const response = await handleCoreRequest(new Request("https://campus.example/ledger/transactions", {
    method: "POST",
    headers: {
      origin: "https://campus.example",
      "content-type": "application/json",
      "idempotency-key": "date-probe",
    },
    body: JSON.stringify({
      type: "income",
      amountVnd: 1,
      categoryId: "1",
      occurredAt: "2026-02-30T12:00:00.000Z",
    }),
  }), deps.value);

  assert.equal(response.status, 422);
});

test("audit log route is restricted to the security role before database access", async () => {
  let databaseCalls = 0;
  const db = {
    query: async () => {
      databaseCalls += 1;
      throw new Error("unexpected database call");
    },
  } as unknown as Db;
  const deps = dependencies({ db, actor: { userId: 73, role: "admin" } });
  const response = await handleCoreRequest(new Request("https://campus.example/admin/audit-logs"), deps.value);

  assert.equal(response.status, 403);
  assert.equal(databaseCalls, 0);
});

test("audit log endpoint rejects forged write requests without database access", async () => {
  let databaseCalls = 0;
  const db = {
    query: async () => {
      databaseCalls += 1;
      throw new Error("unexpected database call");
    },
  } as unknown as Db;
  const deps = dependencies({ db, actor: { userId: 73, role: "admin" } });
  const response = await handleCoreRequest(new Request("https://campus.example/admin/audit-logs", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ actorUserId: 1, action: "forged", outcome: "success" }),
  }), deps.value);

  assert.equal(response.status, 405);
  assert.equal(databaseCalls, 0);
});
