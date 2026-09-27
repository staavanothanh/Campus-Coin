// E2E smoke: DB + application services + OpenAPI contract.
// Mô phỏng critical flow mà frontend sẽ gọi (onboarding → income/payment → savings →
// budget → report → correction → pagination → owner isolation) và validate TỪNG response
// theo components.schemas trong artifacts/openapi.json — schema mà frontend tiêu thụ.
// Gated CAMPUS_COIN_TEST_DB=1 (database tạm). Khi HTTP layer (lane A) và UI (lane C)
// được thêm, smoke này thành true e2e qua HTTP; hiện tại chứng minh DB phối hợp đúng
// với backend business layer và output khớp contract.

import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "../src/infrastructure/db/pool.ts";
import { createMysqlHarness } from "./helpers/mysql-harness.ts";
import { canonicalHash } from "../src/lib/hash.ts";
import { getWallet, initializeWallet } from "../src/application/wallet.service.ts";
import {
  createCorrection,
  createTransaction,
  getTransaction,
  listTransactions,
} from "../src/application/ledger.service.ts";
import { createTransfer, getSavings, listTransfers } from "../src/application/savings.service.ts";
import { listMonthBudgets, monthBudgetSummary, upsertUserBudget } from "../src/application/budget.service.ts";
import { dashboard, monthlyReport } from "../src/application/report.service.ts";
import { listUserCategories } from "../src/application/category.service.ts";
import { currentMonthKey } from "../src/domain/period.ts";
import { DomainError } from "../src/domain/errors.ts";

interface ContractSchema {
  $ref?: string;
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  required?: string[];
  properties?: Record<string, ContractSchema>;
  items?: ContractSchema;
  additionalProperties?: ContractSchema | boolean;
}

interface OpenApiDocument {
  components: { schemas: Record<string, ContractSchema> };
}

export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
  }
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const openApi = JSON.parse(
  await readFile(path.join(repoRoot, "artifacts", "openapi.json"), "utf8"),
) as OpenApiDocument;

function resolveSchema(schema: ContractSchema): ContractSchema {
  if (schema.$ref === undefined) return schema;
  const target = schema.$ref.slice("#/components/schemas/".length);
  const resolved = openApi.components.schemas[target];
  if (resolved === undefined) throw new ContractError(`unresolved OpenAPI schema reference: ${schema.$ref}`);
  return resolveSchema(resolved);
}

function assertSchema(value: unknown, sourceSchema: ContractSchema, location: string): void {
  const schema = resolveSchema(sourceSchema);
  const actualType = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
  const expectedTypes = schema.type === undefined ? [] : Array.isArray(schema.type) ? schema.type : [schema.type];
  const typeMatches = expectedTypes.some((expectedType) => {
    if (expectedType === "integer") return typeof value === "number" && Number.isInteger(value);
    if (expectedType === "number") return typeof value === "number";
    return expectedType === actualType;
  });
  if (expectedTypes.length > 0 && !typeMatches) {
    throw new ContractError(`${location} must have type ${expectedTypes.join(" or ")}`);
  }
  if (schema.const !== undefined && value !== schema.const) {
    throw new ContractError(`${location} must equal its contract constant`);
  }
  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    throw new ContractError(`${location} must be one of the contract enum values`);
  }
  if (schema.minimum !== undefined && typeof value === "number" && value < schema.minimum) {
    throw new ContractError(`${location} must be at least ${schema.minimum}`);
  }
  if (schema.maximum !== undefined && typeof value === "number" && value > schema.maximum) {
    throw new ContractError(`${location} must be at most ${schema.maximum}`);
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      throw new ContractError(`${location} must contain at least ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      throw new ContractError(`${location} must contain at most ${schema.maxLength} characters`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      throw new ContractError(`${location} does not match its contract pattern`);
    }
    if (schema.format === "date-time" && !Number.isFinite(Date.parse(value))) {
      throw new ContractError(`${location} must be a date-time string`);
    }
    if (schema.format === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new ContractError(`${location} must be an email address`);
    }
  }
  if (Array.isArray(value)) {
    const itemSchema = schema.items;
    if (itemSchema !== undefined) {
      value.forEach((item, index) => assertSchema(item, itemSchema, `${location}[${index}]`));
    }
    return;
  }
  const objectValue = value as Record<string, unknown>;
  for (const key of schema.required ?? []) {
    if (!Object.hasOwn(objectValue, key)) throw new ContractError(`${location}.${key} is required by OpenAPI`);
  }
  for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
    if (Object.hasOwn(objectValue, key)) assertSchema(objectValue[key], propertySchema, `${location}.${key}`);
  }
  if (typeof schema.additionalProperties === "object") {
    for (const [key, propertyValue] of Object.entries(objectValue)) {
      if (!Object.hasOwn(schema.properties ?? {}, key)) {
        assertSchema(propertyValue, schema.additionalProperties, `${location}.${key}`);
      }
    }
  }
}

function assertContract(schemaName: string, value: unknown): void {
  const schema = openApi.components.schemas[schemaName];
  if (schema === undefined) throw new ContractError(`unknown OpenAPI schema: ${schemaName}`);
  assertSchema(value, schema, `$[${schemaName}]`);
}

const ENABLED = process.env["CAMPUS_COIN_TEST_DB"] === "1";

if (!ENABLED) {
  test(
    "E2E contract smoke",
    { skip: "Gated: set CAMPUS_COIN_TEST_DB=1 và CAMPUS_COIN_DB_* để chạy (cần MySQL thật)" },
    () => undefined,
  );
} else {
  const harness = createMysqlHarness();

  async function newUserWithWallet(initialVnd: number): Promise<number> {
    const userId = await harness.newUserId();
    await initializeWallet(getPool(), {
      userId,
      initialBalanceVnd: initialVnd,
      idempotencyKey: randomUUID(),
      requestHash: canonicalHash({ initialBalanceVnd: initialVnd }),
    });
    return userId;
  }

  async function createTx(userId: number, type: "income" | "payment", amountVnd: number, categoryId: number) {
    const body = { type, amountVnd, categoryId, occurredAt: new Date().toISOString() };
    return createTransaction(getPool(), {
      userId,
      type,
      amountVnd,
      categoryId,
      occurredAt: body.occurredAt,
      description: null,
      idempotencyKey: randomUUID(),
      requestHash: canonicalHash(body),
    });
  }

  function expectCode(code: string) {
    return (error: unknown): boolean =>
      error instanceof DomainError && error.code === code;
  }

  before(async () => {
    await harness.start();
  });

  after(async () => {
    await harness.stop();
  });

  describe("critical flow qua DB + services, khớp OpenAPI contract", () => {
    test("onboarding: wallet response khớp schema Wallet", async () => {
      const userId = await harness.newUserId();
      assert.equal(await getWallet(getPool(), userId), null);
      const wallet = await initializeWallet(getPool(), {
        userId,
        initialBalanceVnd: 500_000,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ initialBalanceVnd: 500_000 }),
      });
      assertContract("Wallet", wallet);
      assert.equal(wallet.availableBalanceVnd, 500_000);
      assert.equal(wallet.currency, "VND");
    });

    test("categories: income 4, payment 7, mỗi category khớp schema Category", async () => {
      const userId = await harness.newUserId();
      const income = await listUserCategories(getPool(), userId, { appliesTo: "income" });
      const payment = await listUserCategories(getPool(), userId, { appliesTo: "payment" });
      assert.equal(income.length, 4);
      assert.equal(payment.length, 7);
      for (const c of [...income, ...payment]) assertContract("Category", c);
    });

    test("income + payment commit atomic; response khớp Transaction + BudgetWarning", async () => {
      const userId = await newUserWithWallet(500_000);
      const income = await createTx(userId, "income", 100_000, 1);
      assertContract("Transaction", income.transaction);
      assertContract("BudgetWarning", income.budgetWarning);
      const payment = await createTx(userId, "payment", 200_000, 5);
      assertContract("Transaction", payment.transaction);
      const wallet = await getWallet(getPool(), userId);
      assert.equal(wallet!.availableBalanceVnd, 400_000);

      // Payment thiếu tiền: reject, không tạo row, wallet giữ nguyên (semantics 422).
      await assert.rejects(createTx(userId, "payment", 900_000, 5), expectCode("INSUFFICIENT_WALLET_BALANCE"));
      const page = await listTransactions(getPool(), userId, { limit: 10 });
      assert.equal(page.data.length, 2);
    });

    test("idempotency: retry replay response cũ; body khác → conflict", async () => {
      const userId = await newUserWithWallet(500_000);
      const key = randomUUID();
      const body = { type: "income" as const, amountVnd: 50_000, categoryId: 1, occurredAt: new Date().toISOString() };
      const input = {
        userId,
        type: body.type,
        amountVnd: body.amountVnd,
        categoryId: body.categoryId,
        occurredAt: body.occurredAt,
        description: null,
        idempotencyKey: key,
        requestHash: canonicalHash(body),
      };
      const first = await createTransaction(getPool(), input);
      const replay = await createTransaction(getPool(), input);
      assert.equal(replay.transaction.id, first.transaction.id);
      await assert.rejects(
        createTransaction(getPool(), { ...input, requestHash: canonicalHash({ ...body, amountVnd: 60_000 }), amountVnd: 60_000 }),
        expectCode("IDEMPOTENCY_CONFLICT"),
      );
    });

    test("concurrent payment: tối đa một commit trên wallet 100000", async () => {
      const userId = await newUserWithWallet(100_000);
      const results = await Promise.allSettled([
        createTx(userId, "payment", 80_000, 5),
        createTx(userId, "payment", 80_000, 5),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      const wallet = await getWallet(getPool(), userId);
      assert.equal(wallet!.availableBalanceVnd, 20_000);
    });

    test("savings: transfer atomic, tách khỏi income/payment/budget, khớp schema", async () => {
      const userId = await newUserWithWallet(100_000);
      const deposit = await createTransfer(getPool(), {
        userId,
        direction: "deposit",
        amountVnd: 30_000,
        note: "tiết kiệm",
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ direction: "deposit", amountVnd: 30_000 }),
      });
      assertContract("SavingsTransfer", deposit);
      const savings = await getSavings(getPool(), userId);
      assertContract("Savings", savings!);
      assert.equal(savings!.balanceVnd, 30_000);
      const report = await monthlyReport(getPool(), userId, currentMonthKey());
      assertContract("MonthlyReport", report);
      assert.equal(report.totalIncomeVnd + report.totalPaymentVnd, 0); // savings không vào ledger
    });

    test("budget warning-only: overrun không chặn payment; khớp schema Budget", async () => {
      const userId = await newUserWithWallet(500_000);
      const month = currentMonthKey();
      const budgetBody = { categoryId: 5, month, limitVnd: 200_000 };
      const budget = await upsertUserBudget(getPool(), {
        userId,
        ...budgetBody,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash(budgetBody),
      });
      assertContract("Budget", budget);
      const over = await createTx(userId, "payment", 250_000, 5);
      assert.equal(over.budgetWarning.isOverrun, true);
      assert.equal(over.budgetWarning.usedVnd, 250_000);
      assertContract("BudgetWarning", over.budgetWarning);
      const wallet = await getWallet(getPool(), userId);
      assert.equal(wallet!.availableBalanceVnd, 250_000); // không bị chặn
      const budgets = await listMonthBudgets(getPool(), userId, month);
      assertContract("Budget", budgets[0]!);
      const summary = await monthBudgetSummary(getPool(), userId, month);
      assert.equal(summary.exceededCategoryCount, 1);
      assert.equal(summary.totalUsedVnd, 250_000);
    });

    test("correction append-only: reversal khớp schema Transaction, balance khớp", async () => {
      const userId = await newUserWithWallet(500_000);
      const income = await createTx(userId, "income", 100_000, 1);
      const reversal = await createCorrection(getPool(), {
        userId,
        targetId: Number(income.transaction.id),
        role: "reversal",
        reason: "nhập sai",
        newAmountVnd: null,
        newCategoryId: null,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ targetId: income.transaction.id, role: "reversal", reason: "nhập sai" }),
      });
      assertContract("Transaction", reversal.transaction);
      assert.equal(reversal.transaction.role, "reversal");
      const wallet = await getWallet(getPool(), userId);
      assert.equal(wallet!.availableBalanceVnd, 500_000);
    });

    test("report deterministic: closing = opening + income - payment; breakdown khớp", async () => {
      const userId = await newUserWithWallet(500_000);
      await createTx(userId, "income", 100_000, 1);
      await createTx(userId, "payment", 200_000, 5);
      const report = await monthlyReport(getPool(), userId, currentMonthKey());
      assertContract("MonthlyReport", report);
      assert.equal(report.openingWalletBalanceVnd, 500_000);
      assert.equal(report.totalIncomeVnd, 100_000);
      assert.equal(report.totalPaymentVnd, 200_000);
      assert.equal(report.closingWalletBalanceVnd, 400_000);
      assert.equal(report.categoryBreakdown.length, 1);
    });

    test("keyset pagination: meta khớp PageMeta, không trùng trang", async () => {
      const userId = await newUserWithWallet(1_000_000);
      for (let i = 0; i < 3; i += 1) await createTx(userId, "payment", 10_000, 5);
      const page1 = await listTransactions(getPool(), userId, { limit: 2 });
      assertContract("PageMeta", page1.meta);
      assert.equal(page1.meta.hasNext, true);
      const page2 = await listTransactions(getPool(), userId, { limit: 2, cursor: page1.meta.cursor! });
      assertContract("PageMeta", page2.meta);
      assert.equal(page2.meta.hasNext, false);
      const ids = new Set([...page1.data, ...page2.data].map((t) => t.id));
      assert.equal(ids.size, 3);
    });

    test("owner isolation: user B không đọc được transaction user A", async () => {
      const userA = await newUserWithWallet(500_000);
      const income = await createTx(userA, "income", 50_000, 1);
      const userB = await newUserWithWallet(100_000);
      assert.equal(await getTransaction(getPool(), userB, Number(income.transaction.id)), null);
      const pageB = await listTransactions(getPool(), userB, { limit: 10 });
      assert.equal(pageB.data.length, 0);
    });

    test("dashboard tổng hợp: wallet/savings/report/recent đều khớp contract", async () => {
      const userId = await newUserWithWallet(500_000);
      await createTx(userId, "income", 100_000, 1);
      await createTransfer(getPool(), {
        userId,
        direction: "deposit",
        amountVnd: 20_000,
        note: "",
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ direction: "deposit", amountVnd: 20_000 }),
      });
      const dash = await dashboard(getPool(), userId);
      assert.notEqual(dash.wallet, null);
      assert.notEqual(dash.savings, null);
      assert.notEqual(dash.currentMonth, null);
      assertContract("Wallet", dash.wallet!);
      assertContract("Savings", dash.savings!);
      assertContract("MonthlyReport", dash.currentMonth!);
      for (const t of dash.recentTransactions) assertContract("Transaction", t);
      assert.equal(dash.recentTransactions.length, 1);
    });
  });

  // Đảm bảo helper assertContract thực sự phát hiện lệch (không phải test no-op).
  describe("contract validator hoạt động", () => {
    test("sai shape bị bắt", () => {
      assert.throws(() => assertContract("Transaction", { wrong: true }), ContractError);
      assert.throws(() => assertContract("Wallet", { walletId: "1", availableBalanceVnd: 1.5 }), ContractError);
    });
  });
}
