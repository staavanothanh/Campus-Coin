
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleCoreRequest, type CoreActor, type CoreApiDependencies } from "../src/api/core-routes.ts";
import { handleApiRequest } from "../src/api/handler.ts";
import type { Db } from "../src/infrastructure/db/pool.ts";

function dependencies(options: {
  actor?: CoreActor | null;
  csrfValid?: boolean;
  allowedOrigins?: ReadonlySet<string>;
  db?: Db;
  jevService?: CoreApiDependencies["jevService"];
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
      ...(options.jevService === undefined ? {} : { jevService: options.jevService }),
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

test("cashflow plan creation validates bounded guidance input before persistence", async () => {
  let databaseCalls = 0;
  const deps = dependencies({ db: { query: async () => { databaseCalls += 1; return [[], []]; } } as unknown as Db });
  const response = await handleCoreRequest(new Request("https://campus.example/cashflow/plans", {
    method: "POST",
    headers: {
      origin: "https://campus.example",
      "content-type": "application/json",
      "idempotency-key": "cashflow-invalid-input",
    },
    body: JSON.stringify({
      kind: "expected_income",
      title: "Monthly allowance",
      amountVnd: 100_000,
      frequency: "monthly",
      startsOn: "2026-02-30",
      dueDay: 30,
      reserveInForecast: false,
    }),
  }), deps.value);

  assert.equal(response.status, 422);
  assert.equal(databaseCalls, 0);
  assert.equal(((await responseBody(response)).error as { code: string }).code, "INVALID_INPUT");
});

test("cashflow writes require the existing origin and CSRF boundary", async () => {
  let databaseCalls = 0;
  const deps = dependencies({
    csrfValid: false,
    db: { query: async () => { databaseCalls += 1; return [[], []]; } } as unknown as Db,
  });
  const response = await handleCoreRequest(new Request("https://campus.example/cashflow/plans", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({}),
  }), deps.value);

  assert.equal(response.status, 403);
  assert.equal(databaseCalls, 0);
  assert.equal(deps.csrfChecks(), 1);
});

test("shared API entrypoint dispatches issue routes and exposes only the documented public liveness route", async () => {
  const deps = dependencies({ actor: null });
  const healthResponse = await handleApiRequest(new Request("https://campus.example/health"), deps.value);
  const issueResponse = await handleApiRequest(new Request("https://campus.example/issues/me"), deps.value);

  assert.equal(healthResponse.status, 200);
  assert.equal(issueResponse.status, 401);
  assert.equal(((await responseBody(issueResponse)).error as { code: string }).code, "UNAUTHORIZED");
});

test("JEV suggestion route uses server-owned active categories and remains advisory", async () => {
  let categoryQuery = "";
  let categoryParameters: unknown[] | undefined;
  let serviceInput: Parameters<NonNullable<CoreApiDependencies["jevService"]>["suggest"]>[0] | undefined;
  const db = {
    query: async (sql: string, parameters?: unknown[]) => {
      categoryQuery = sql;
      categoryParameters = parameters;
      return [[
        { id: 1, user_id: null, name_en: "Salary", name_vi: "Lương", applies_to: "income", status: "active", is_default: 1 },
      ], []];
    },
  } as unknown as Db;
  const deps = dependencies({ db, jevService: { suggest: async (input) => {
    serviceInput = input;
    return {
      status: "suggested",
      categoryId: input.candidates[0]?.id ?? "missing",
      confidence: 0.91,
      reasonCode: null,
    };
  } } });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "income", description: "Part time wage", locale: "vi" }),
  }), deps.value);

  assert.equal(response.status, 200);
  assert.deepEqual(await responseBody(response), {
    success: true,
    data: { status: "suggested", categoryId: "1", confidence: 0.91, reasonCode: null },
    error: null,
    meta: null,
  });
  assert.ok(categoryQuery.includes("user_id IS NULL OR user_id = ?"));
  assert.ok(categoryQuery.includes("status = 'active'"));
  assert.deepEqual(categoryParameters, [73, "income"]);
  assert.equal(serviceInput?.transactionType, "income");
  assert.equal(serviceInput?.descriptionRedacted, "Part time wage");
  assert.equal(serviceInput?.locale, "vi");
  assert.deepEqual(serviceInput?.candidates.map(({ semanticLabel, active, appliesTo }) => ({ semanticLabel, active, appliesTo })), [
    { semanticLabel: "Lương", active: true, appliesTo: ["income"] },
  ]);
  assert.ok(serviceInput?.candidates.every(({ id }) => /^[0-9a-f-]{36}$/i.test(id)));
  assert.notEqual(serviceInput?.candidates[0]?.id, "1");
});
test("JEV route redacts personal data before crossing the injected service boundary", async () => {
  let serviceInput: Parameters<NonNullable<CoreApiDependencies["jevService"]>["suggest"]>[0] | undefined;
  const db = {
    query: async () => [[
      { id: 1, user_id: null, name_en: "Salary", name_vi: "Lương", applies_to: "income", status: "active", is_default: 1 },
    ], []],
  } as unknown as Db;
  const deps = dependencies({ db, jevService: { suggest: async (input) => {
    serviceInput = input;
    return { status: "manual", categoryId: null, confidence: null, reasonCode: null };
  } } });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "income", description: "Salary contact ana@example.com at +1 415 555 2671", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 200);
  assert.equal(serviceInput?.descriptionRedacted.includes("ana@example.com"), false);
  assert.equal(serviceInput?.descriptionRedacted.includes("415 555 2671"), false);
  assert.match(serviceInput?.descriptionRedacted ?? "", /\[REDACTED\]/);
});

test("JEV route withholds bearer credentials before category access", async () => {
  let serviceCalls = 0;
  let databaseCalls = 0;
  const db = { query: async () => { databaseCalls += 1; return [[], []]; } } as unknown as Db;
  const deps = dependencies({ db, jevService: { suggest: async () => {
    serviceCalls += 1;
    return { status: "manual", categoryId: null, confidence: null, reasonCode: null };
  } } });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "income", description: "Salary note Bearer synthetic-token-value", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 200);
  assert.deepEqual((await responseBody(response)).data, {
    status: "manual", categoryId: null, confidence: null, reasonCode: "privacy",
  });
  assert.equal(databaseCalls, 0);
  assert.equal(serviceCalls, 0);
});

test("JEV route preserves benign numeric transaction details after removing broad digit rejection", async () => {
  let serviceInput: Parameters<NonNullable<CoreApiDependencies["jevService"]>["suggest"]>[0] | undefined;
  const db = {
    query: async () => [[
      { id: 1, user_id: null, name_en: "Salary", name_vi: "Lương", applies_to: "income", status: "active", is_default: 1 },
    ], []],
  } as unknown as Db;
  const deps = dependencies({ db, jevService: { suggest: async (input) => {
    serviceInput = input;
    return { status: "manual", categoryId: null, confidence: null, reasonCode: null };
  } } });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "income", description: "Salary for 2026-09, shift 2", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 200);
  assert.equal(serviceInput?.descriptionRedacted, "Salary for 2026-09, shift 2");
});
test("JEV route redacts labeled internal identifiers before calling the service", async () => {
  let serviceCalls = 0;
  let serviceInput: Parameters<NonNullable<CoreApiDependencies["jevService"]>["suggest"]>[0] | undefined;
  const db = {
    query: async () => [[
      { id: 1, user_id: null, name_en: "Salary", name_vi: "Lương", applies_to: "income", status: "active", is_default: 1 },
    ], []],
  } as unknown as Db;
  const deps = dependencies({ db, jevService: { suggest: async (input) => {
    serviceCalls += 1;
    serviceInput = input;
    return { status: "manual", categoryId: null, confidence: null, reasonCode: null };
  } } });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "income", description: "Salary account: customer-123456", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 200);
  assert.equal(serviceCalls, 1);
  assert.equal(serviceInput?.descriptionRedacted.includes("customer-123456"), false);
  assert.match(serviceInput?.descriptionRedacted ?? "", /\[REDACTED\]/);
});
test("JEV route returns manual fallback when the injected service rejects", async () => {
  const db = {
    query: async () => [[
      { id: 1, user_id: null, name_en: "Salary", name_vi: "Lương", applies_to: "income", status: "active", is_default: 1 },
    ], []],
  } as unknown as Db;
  const deps = dependencies({ db, jevService: { suggest: async () => {
    throw new Error("provider failure details must not escape");
  } } });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "income", description: "Pay", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 200);
  assert.deepEqual((await responseBody(response)).data, {
    status: "manual", categoryId: null, confidence: null, reasonCode: null,
  });
});

test("JEV route returns manual fallback for an unknown provider choice", async () => {
  const db = {
    query: async () => [[
      { id: 1, user_id: null, name_en: "Salary", name_vi: "Lương", applies_to: "income", status: "active", is_default: 1 },
    ], []],
  } as unknown as Db;
  const deps = dependencies({ db, jevService: { suggest: async () => ({
    status: "suggested",
    categoryId: "not-in-server-candidates",
    confidence: 0.99,
    reasonCode: null,
  }) } });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "income", description: "Pay", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 200);
  assert.deepEqual((await responseBody(response)).data, {
    status: "manual", categoryId: null, confidence: null, reasonCode: "schema",
  });
});

test("JEV route blocks a custom category that duplicates a safe label", async () => {
  let serviceCalls = 0;
  const db = {
    query: async () => [[
      { id: 5, user_id: null, name_en: "Food & Dining", name_vi: "Ăn uống", applies_to: "payment", status: "active", is_default: 1 },
      { id: 12, user_id: 73, name_en: "Food & Dining", name_vi: "Private grocery ledger", applies_to: "payment", status: "active", is_default: 0 },
    ], []],
  } as unknown as Db;
  const deps = dependencies({ db, jevService: { suggest: async () => {
    serviceCalls += 1;
    return { status: "suggested", categoryId: "unused", confidence: 0.99, reasonCode: null };
  } } });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "payment", description: "Groceries", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 200);
  assert.deepEqual((await responseBody(response)).data, {
    status: "manual", categoryId: null, confidence: null, reasonCode: "privacy",
  });
  assert.equal(serviceCalls, 0);
});
test("JEV route uses manual fallback when an active custom category label contains sensitive data", async () => {
  const sensitiveLabel = "Bank account 123456789";
  let serviceCalls = 0;
  const db = {
    query: async () => [[
      { id: 14, user_id: 73, name_en: sensitiveLabel, name_vi: "Tài khoản ngân hàng 123456789", applies_to: "payment", status: "active", is_default: 0 },
    ], []],
  } as unknown as Db;
  const deps = dependencies({ db, jevService: { suggest: async () => {
    serviceCalls += 1;
    return { status: "suggested", categoryId: "unused", confidence: 0.99, reasonCode: null };
  } } });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "payment", description: "Groceries", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 200);
  assert.deepEqual((await responseBody(response)).data, {
    status: "manual", categoryId: null, confidence: null, reasonCode: "privacy",
  });
  assert.equal(serviceCalls, 0);
});



test("JEV route permits only listed default category labels in provider candidates", async () => {
  let serviceInput: Parameters<NonNullable<CoreApiDependencies["jevService"]>["suggest"]>[0] | undefined;
  const db = {
    query: async () => [[
      { id: 5, user_id: null, name_en: "Food & Dining", name_vi: "Ăn uống", applies_to: "payment", status: "active", is_default: 1 },
    ], []],
  } as unknown as Db;
  const deps = dependencies({ db, jevService: { suggest: async (input) => {
    serviceInput = input;
    return { status: "manual", categoryId: null, confidence: null, reasonCode: "low_confidence" };
  } } });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "payment", description: "Groceries", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 200);
  assert.deepEqual(serviceInput?.candidates.map(({ semanticLabel }) => semanticLabel), ["Food & Dining"]);
});
for (const { label, locale } of [
  { label: "John Smith", locale: "en" as const },
  { label: "Nguyễn Trãi", locale: "vi" as const },
]) {
  test(`JEV route withholds unapproved custom label ${JSON.stringify(label)}`, async () => {
    let serviceCalls = 0;
    const db = {
      query: async () => [[
        { id: 9, user_id: 73, name_en: label, name_vi: label, applies_to: "payment", status: "active", is_default: 0 },
      ], []],
    } as unknown as Db;
    const deps = dependencies({ db, jevService: { suggest: async () => {
      serviceCalls += 1;
      return { status: "suggested", categoryId: "unused", confidence: 0.99, reasonCode: null };
    } } });
    const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
      method: "POST",
      headers: { origin: "https://campus.example", "content-type": "application/json" },
      body: JSON.stringify({ transactionType: "payment", description: "Groceries", locale }),
    }), deps.value);

    assert.equal(response.status, 200);
    assert.deepEqual((await responseBody(response)).data, {
      status: "manual", categoryId: null, confidence: null, reasonCode: "privacy",
    });
    assert.equal(serviceCalls, 0);
  });
}

test("JEV route replaces out-of-contract injected service results with a safe schema fallback", async () => {
  const db = {
    query: async () => [[
      { id: 1, user_id: null, name_en: "Salary", name_vi: "Lương", applies_to: "income", status: "active", is_default: 1 },
    ], []],
  } as unknown as Db;
  const invalidService = {
    suggest: async () => ({
      status: "manual",
      categoryId: null,
      confidence: null,
      reasonCode: "raw internal error text",
      rawProviderPayload: "must not escape",
    }),
  } as unknown as NonNullable<CoreApiDependencies["jevService"]>;
  const deps = dependencies({ db, jevService: invalidService });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "income", description: "Pay", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 200);
  assert.deepEqual((await responseBody(response)).data, {
    status: "manual", categoryId: null, confidence: null, reasonCode: "schema",
  });
});

test("JEV suggestion route returns disabled fallback when no service is injected", async () => {
  let databaseCalls = 0;
  const db = { query: async () => { databaseCalls += 1; throw new Error("unexpected DB access"); } } as unknown as Db;
  const deps = dependencies({ db });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "payment", description: "Lunch", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 200);
  assert.deepEqual((await responseBody(response)).data, {
    status: "disabled", categoryId: null, confidence: null, reasonCode: "flag_off",
  });
  assert.equal(databaseCalls, 0);
});

test("JEV suggestion route preserves configured manual fallback", async () => {
  let serviceCalls = 0;
  const db = {
    query: async () => [[
      { id: 5, user_id: null, name_en: "Food & Dining", name_vi: "Ăn uống", applies_to: "payment", status: "active", is_default: 1 },
    ], []],
  } as unknown as Db;
  const deps = dependencies({ db, jevService: { suggest: async () => {
    serviceCalls += 1;
    return { status: "disabled", categoryId: null, confidence: null, reasonCode: "flag_off" };
  } } });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "payment", description: "Lunch", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 200);
  assert.deepEqual((await responseBody(response)).data, {
    status: "disabled", categoryId: null, confidence: null, reasonCode: "flag_off",
  });
  assert.equal(serviceCalls, 1);
});

test("JEV suggestion route validates input before category access", async () => {
  let databaseCalls = 0;
  const db = { query: async () => { databaseCalls += 1; return [[], []]; } } as unknown as Db;
  const deps = dependencies({ db });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "transfer", description: "Lunch", locale: "en", userId: 73 }),
  }), deps.value);

  assert.equal(response.status, 422);
  assert.deepEqual((await responseBody(response)).error, { code: "INVALID_INPUT", message: "unexpected field: userId" });
  assert.equal(databaseCalls, 0);
});

test("JEV suggestion route rejects unauthorized requests before reading categories", async () => {
  let databaseCalls = 0;
  const db = { query: async () => { databaseCalls += 1; throw new Error("unexpected DB access"); } } as unknown as Db;
  const deps = dependencies({ db, actor: null });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "payment", description: "Lunch", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 401);
  assert.equal(databaseCalls, 0);
});

test("JEV suggestion route rejects untrusted origins before reading categories", async () => {
  let databaseCalls = 0;
  const db = { query: async () => { databaseCalls += 1; throw new Error("unexpected DB access"); } } as unknown as Db;
  const deps = dependencies({ db });
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion", {
    method: "POST",
    headers: { origin: "https://attacker.example", "content-type": "application/json" },
    body: JSON.stringify({ transactionType: "payment", description: "Lunch", locale: "en" }),
  }), deps.value);

  assert.equal(response.status, 403);
  assert.equal(deps.csrfChecks(), 0);
  assert.equal(databaseCalls, 0);
});

test("JEV suggestion route reports unsupported methods consistently", async () => {
  const deps = dependencies();
  const response = await handleApiRequest(new Request("https://campus.example/ai/category-suggestion"), deps.value);

  assert.equal(response.status, 405);
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
