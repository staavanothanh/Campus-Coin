import { test } from "node:test";
import assert from "node:assert/strict";
import { handleApiRequest, stripApiV1Prefix, type ApiDependencies } from "../src/api/handler.ts";
import type { Db } from "../src/infrastructure/db/pool.ts";

function deps(actor: { userId: number; role: "user" | "admin" | "security" } | null = null): ApiDependencies {
  return {
    db: {} as Db,
    allowedOrigins: new Set(["https://campus.example"]),
    resolveSession: async () => actor,
    verifyCsrf: async () => true,
  };
}

test("stripApiV1Prefix chấp nhận đúng một prefix /api/v1 tùy chọn", () => {
  assert.equal(stripApiV1Prefix("/api/v1"), "/");
  assert.equal(stripApiV1Prefix("/api/v1/health"), "/health");
  assert.equal(stripApiV1Prefix("/api/v1/api/v1/health"), "/api/v1/health");
  assert.equal(stripApiV1Prefix("/health"), "/health");
  assert.equal(stripApiV1Prefix("/api/v2/health"), "/api/v2/health");
  assert.equal(stripApiV1Prefix("/api/v10/health"), "/api/v10/health");
  assert.equal(stripApiV1Prefix("/api/v1extra"), "/api/v1extra");
});

test("dispatcher phục vụ route public qua cả bare path và /api/v1 prefix", async () => {
  const bare = await handleApiRequest(new Request("https://campus.example/health"), deps());
  const prefixed = await handleApiRequest(new Request("https://campus.example/api/v1/health"), deps());
  assert.equal(bare.status, 200);
  assert.equal(prefixed.status, 200);
  const bareBody = await bare.json() as { success: boolean; data: { status: string } };
  const prefixedBody = await prefixed.json() as { success: boolean; data: { status: string } };
  assert.equal(bareBody.success, true);
  assert.equal(prefixedBody.success, true);
  assert.equal(bareBody.data.status, "pass");
  assert.equal(prefixedBody.data.status, "pass");
});

test("prefix lạ hoặc double prefix không đoán mò: routing trả 404 khi đã auth", async () => {
  const actor = { userId: 7, role: "user" as const };
  const v2 = await handleApiRequest(new Request("https://campus.example/api/v2/health"), deps(actor));
  assert.equal(v2.status, 404);
  // Strip đúng một lần còn /api/v1/health → vẫn unknown, 404.
  const double = await handleApiRequest(new Request("https://campus.example/api/v1/api/v1/health"), deps(actor));
  assert.equal(double.status, 404);
});

test("rewrite prefix giữ nguyên method/body: POST lạ vẫn qua auth gate 401", async () => {
  const response = await handleApiRequest(new Request("https://campus.example/api/v1/nope", {
    method: "POST",
    headers: { origin: "https://campus.example", "content-type": "application/json" },
    body: JSON.stringify({ a: 1 }),
  }), deps());
  assert.equal(response.status, 401);
});
