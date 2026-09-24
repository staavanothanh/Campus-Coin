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
import { getPool } from "../src/infrastructure/db/pool.ts";
import { createMysqlHarness } from "./helpers/mysql-harness.ts";
import { assertContract, ContractError } from "./helpers/contract.ts";
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
      const budget = await upsertUserBudget(getPool(), {
        userId,
        categoryId: 5,
        month,
        limitVnd: 200_000,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ categoryId: 5, month, limitVnd: 200_000 }),
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
