// Integration MySQL — gated: chỉ chạy khi CAMPUS_COIN_TEST_DB=1 và có CAMPUS_COIN_DB_*.
// Tạo database tạm, migrate mọi version local, chạy services thật, drop database sau cùng.
// Chạy: set CAMPUS_COIN_TEST_DB=1 && npm test -- test/mysql.integration.test.ts

import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPool } from "../src/infrastructure/db/pool.ts";
import { createMysqlHarness } from "./helpers/mysql-harness.ts";
import { canonicalHash } from "../src/lib/hash.ts";
import { getWallet, initializeWallet } from "../src/application/wallet.service.ts";
import { createCorrection, createTransaction, getTransaction, listTransactions } from "../src/application/ledger.service.ts";
import { createTransfer, getSavings, listTransfers } from "../src/application/savings.service.ts";
import { listMonthBudgets, monthBudgetSummary, upsertUserBudget } from "../src/application/budget.service.ts";
import { monthlyReport } from "../src/application/report.service.ts";
import { createCustomCategory, listUserCategories, updateUserCategory } from "../src/application/category.service.ts";
import { currentMonthKey, monthRangeUtc } from "../src/domain/period.ts";
import { DomainError } from "../src/domain/errors.ts";
import { reconcileFinancialProjections } from "../src/application/reconciliation.service.ts";
import { monthTotals } from "../src/infrastructure/persistence/report.repository.ts";
import { amountFromDb } from "../src/infrastructure/persistence/rows.ts";

const ENABLED = process.env["CAMPUS_COIN_TEST_DB"] === "1";

if (!ENABLED) {
  test(
    "MySQL integration suite",
    { skip: "Gated: set CAMPUS_COIN_TEST_DB=1 và CAMPUS_COIN_DB_* để chạy (cần MySQL thật)" },
    () => undefined,
  );
} else {
  const harness = createMysqlHarness();

  function expectCode(code: string) {
    return (error: unknown): boolean =>
      error instanceof DomainError && error.code === code;
  }

  async function getWalletFor(userId: number) {
    const wallet = await getWallet(getPool(), userId);
    if (wallet === null) throw new Error("wallet missing");
    return wallet;
  }

  async function initWalletFor(userId: number, initialBalanceVnd: number) {
    return initializeWallet(getPool(), {
      userId,
      initialBalanceVnd,
      idempotencyKey: randomUUID(),
      requestHash: canonicalHash({ initialBalanceVnd }),
    });
  }

  async function newUserId(): Promise<number> {
    return harness.newUserId();
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

  async function ledgerCountFor(userId: number): Promise<number> {
    const [rows] = (await getPool().query(
      `SELECT COUNT(*) AS n FROM \`${harness.dbName}\`.ledger_transactions WHERE user_id = ?`,
      [userId],
    )) as [{ n: number | string }[], unknown];
    return Number(rows[0]!.n);
  }

  async function auditCountFor(userId: number, action: string): Promise<number> {
    const [rows] = (await getPool().query(
      `SELECT COUNT(*) AS n FROM \`${harness.dbName}\`.audit_events WHERE user_id = ? AND action = ?`,
      [userId, action],
    )) as [{ n: number | string }[], unknown];
    return Number(rows[0]!.n);
  }

  before(async () => {
    await harness.start();
  });

  after(async () => {
    await harness.stop();
  });

  describe("migrations", () => {
    test("seed hệ thống: 11 default categories (income 4, payment 7)", async () => {
      const counts = (await getPool().query(
        `SELECT applies_to, COUNT(*) AS n FROM \`${harness.dbName}\`.categories WHERE is_default = 1 GROUP BY applies_to`,
      )) as [{ applies_to: string; n: number | string }[], unknown];
      const byType = new Map(counts[0].map((r) => [r.applies_to, Number(r.n)]));
      assert.equal(byType.get("income"), 4);
      assert.equal(byType.get("payment"), 7);
    });
  });

  describe("wallet/savings reconciliation", () => {
    test("rebuild comparison matches projections after ledger and savings mutations", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 50_000);
      await createTx(userId, "income", 20_000, 1);
      await createTransfer(getPool(), {
        userId,
        direction: "deposit",
        amountVnd: 10_000,
        note: null,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ direction: "deposit", amountVnd: 10_000 }),
      });

      const result = await reconcileFinancialProjections(getPool());
      assert.equal(result.isConsistent, true);
      assert.equal(result.walletMismatches, 0);
      assert.equal(result.savingsMismatches, 0);
    });
  });

  describe("wallet baseline", () => {
    test("khởi tạo một lần; lặp lại → WALLET_ALREADY_INITIALIZED", async () => {
      const userId = await newUserId();
      const wallet = await initWalletFor(userId, 500_000);
      assert.equal(wallet.availableBalanceVnd, 500_000);
      assert.equal(wallet.currency, "VND");
      await assert.rejects(initWalletFor(userId, 700_000), expectCode("WALLET_ALREADY_INITIALIZED"));
    });

    test("retry cùng key+body → replay; cùng key khác body → IDEMPOTENCY_CONFLICT", async () => {
      const userId = await newUserId();
      const key = randomUUID();
      const hash = canonicalHash({ initialBalanceVnd: 300_000 });
      const first = await initializeWallet(getPool(), {
        userId,
        initialBalanceVnd: 300_000,
        idempotencyKey: key,
        requestHash: hash,
      });
      const replay = await initializeWallet(getPool(), {
        userId,
        initialBalanceVnd: 300_000,
        idempotencyKey: key,
        requestHash: hash,
      });
      assert.equal(replay.walletId, first.walletId);
      const conflict = initializeWallet(getPool(), {
        userId,
        initialBalanceVnd: 999_999,
        idempotencyKey: key,
        requestHash: canonicalHash({ initialBalanceVnd: 999_999 }),
      });
      await assert.rejects(conflict, expectCode("IDEMPOTENCY_CONFLICT"));
    });
  });

  describe("ledger income/payment", () => {
    test("income +100000, payment 200000 cập nhật wallet đúng", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 500_000);
      await createTx(userId, "income", 100_000, 1);
      await createTx(userId, "payment", 200_000, 5);
      const wallet = await getWalletFor(userId);
      assert.equal(wallet.availableBalanceVnd, 400_000);
    });

    test("payment thiếu tiền → INSUFFICIENT_WALLET_BALANCE, không tạo row", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 400_000);
      await assert.rejects(createTx(userId, "payment", 900_000, 5), expectCode("INSUFFICIENT_WALLET_BALANCE"));
      assert.equal(await ledgerCountFor(userId), 0);
    });

    test("hai payment đồng thời trên wallet 100000: chỉ một commit", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 100_000);
      const results = await Promise.allSettled([
        createTx(userId, "payment", 80_000, 5),
        createTx(userId, "payment", 80_000, 5),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(results.filter((r) => r.status === "rejected").length, 1);
      const wallet = await getWalletFor(userId);
      assert.equal(wallet.availableBalanceVnd, 20_000);
      assert.equal(await ledgerCountFor(userId), 1);
    });

    test("category sai type → CATEGORY_TYPE_MISMATCH; category disabled → CATEGORY_DISABLED", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 500_000);
      // category 1 là income, dùng cho payment.
      await assert.rejects(createTx(userId, "payment", 10_000, 1), expectCode("CATEGORY_TYPE_MISMATCH"));
      const created = await createCustomCategory(getPool(), {
        userId,
        nameEn: "Disable me",
        nameVi: "",
        appliesTo: "payment",
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ nameEn: "Disable me", nameVi: "", appliesTo: "payment" }),
      });
      assert.notEqual(created, null);
      await updateUserCategory(getPool(), {
        userId,
        categoryId: Number(created!.id),
        status: "disabled",
      });
      const otherUserId = await newUserId();
      await assert.rejects(
        updateUserCategory(getPool(), {
          userId: otherUserId,
          categoryId: Number(created!.id),
          nameEn: "Cross-owner change",
        }),
        expectCode("NOT_FOUND"),
      );
      const ownerCategories = await listUserCategories(getPool(), userId, { includeDisabled: true });
      assert.equal(ownerCategories.find((category) => Number(category.id) === Number(created!.id))?.name.en, "Disable me");
      await assert.rejects(
        createTx(userId, "payment", 10_000, Number(created!.id)),
        expectCode("CATEGORY_DISABLED"),
      );
    });

    test("category update rolls back when MySQL rejects its audit insert", async () => {
      const userId = await newUserId();
      const body = { nameEn: "Atomic update", nameVi: "Cập nhật atomic", appliesTo: "payment" as const };
      const category = await createCustomCategory(getPool(), {
        userId,
        ...body,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash(body),
      });
      assert.notEqual(category, null);

      await harness.setAuditInsertFailure(true);
      try {
        await assert.rejects(
          updateUserCategory(getPool(), { userId, categoryId: Number(category!.id), status: "disabled" }),
          /test audit insert rejected/,
        );
      } finally {
        await harness.setAuditInsertFailure(false);
      }

      const categories = await listUserCategories(getPool(), userId, { includeDisabled: true });
      const unchanged = categories.find((candidate) => Number(candidate.id) === Number(category!.id));
      assert.equal(unchanged?.status, "active");
      assert.equal(await auditCountFor(userId, "category.update"), 0);
    });

    test("custom category retry replays; same key with different body conflicts", async () => {
      const userId = await newUserId();
      const key = randomUUID();
      const body = { nameEn: "Books", nameVi: "Sách", appliesTo: "payment" as const };
      const input = { userId, ...body, idempotencyKey: key, requestHash: canonicalHash(body) };

      const [first, replay] = await Promise.all([
        createCustomCategory(getPool(), input),
        createCustomCategory(getPool(), input),
      ]);
      assert.deepEqual(replay, first);
      assert.equal(await auditCountFor(userId, "category.create"), 1);

      await assert.rejects(
        createCustomCategory(getPool(), {
          ...input,
          nameVi: "Tài liệu",
          requestHash: canonicalHash({ ...body, nameVi: "Tài liệu" }),
        }),
        expectCode("IDEMPOTENCY_CONFLICT"),
      );
      const [rows] = (await getPool().query(
        `SELECT COUNT(*) AS n FROM \`${harness.dbName}\`.categories WHERE user_id = ? AND name_en = ?`,
        [userId, body.nameEn],
      )) as [{ n: number | string }[], unknown];
      assert.equal(Number(rows[0]!.n), 1);
      assert.equal(await auditCountFor(userId, "category.create"), 1);

      const otherUserId = await newUserId();
      const otherOwnerResult = await createCustomCategory(getPool(), { ...input, userId: otherUserId });
      assert.notEqual(otherOwnerResult?.id, first?.id);
      assert.equal(await auditCountFor(otherUserId, "category.create"), 1);
    });
  });

  describe("idempotency ledger", () => {
    test("retry cùng key → replay cùng transaction, không duplicate", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 500_000);
      const key = randomUUID();
      const body = { type: "income" as const, amountVnd: 100_000, categoryId: 1, occurredAt: new Date().toISOString() };
      const first = await createTransaction(getPool(), {
        userId,
        type: body.type,
        amountVnd: body.amountVnd,
        categoryId: body.categoryId,
        occurredAt: body.occurredAt,
        description: null,
        idempotencyKey: key,
        requestHash: canonicalHash(body),
      });
      const replay = await createTransaction(getPool(), {
        userId,
        type: body.type,
        amountVnd: body.amountVnd,
        categoryId: body.categoryId,
        occurredAt: body.occurredAt,
        description: null,
        idempotencyKey: key,
        requestHash: canonicalHash(body),
      });
      assert.equal(replay.transaction.id, first.transaction.id);
      assert.equal(await ledgerCountFor(userId), 1);
      const wallet = await getWalletFor(userId);
      assert.equal(wallet.availableBalanceVnd, 600_000);
    });
  });

  describe("correction append-only", () => {
    test("reversal income trả tiền; không chain; target phải original", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 500_000);
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
      assert.equal(reversal.transaction.role, "reversal");
      const wallet = await getWalletFor(userId);
      assert.equal(wallet.availableBalanceVnd, 500_000);
      // Correction lặp lại trên cùng target bị chặn.
      await assert.rejects(
        createCorrection(getPool(), {
          userId,
          targetId: Number(income.transaction.id),
          role: "reversal",
          reason: "lần nữa",
          newAmountVnd: null,
          newCategoryId: null,
          idempotencyKey: randomUUID(),
          requestHash: canonicalHash({ targetId: income.transaction.id, role: "reversal", reason: "lần nữa" }),
        }),
        expectCode("CORRECTION_NOT_ALLOWED"),
      );
      // Không sửa được row correction (append-only) — phần trigger test.
    });

    test("reversal payment hoàn tiền về wallet", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 500_000);
      const payment = await createTx(userId, "payment", 120_000, 5);
      await createCorrection(getPool(), {
        userId,
        targetId: Number(payment.transaction.id),
        role: "reversal",
        reason: "hoàn tiền",
        newAmountVnd: null,
        newCategoryId: null,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ targetId: payment.transaction.id, role: "reversal", reason: "hoàn tiền" }),
      });
      const wallet = await getWalletFor(userId);
      assert.equal(wallet.availableBalanceVnd, 500_000);
    });
  });

  describe("savings", () => {
    test("deposit/withdraw atomic; không vào income/payment/budget", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 100_000);
      await createTransfer(getPool(), {
        userId,
        direction: "deposit",
        amountVnd: 30_000,
        note: "tiết kiệm",
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ direction: "deposit", amountVnd: 30_000 }),
      });
      await createTransfer(getPool(), {
        userId,
        direction: "withdraw",
        amountVnd: 20_000,
        note: "rút",
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ direction: "withdraw", amountVnd: 20_000 }),
      });
      const wallet = await getWalletFor(userId);
      const savings = await getSavings(getPool(), userId);
      assert.equal(wallet.availableBalanceVnd, 90_000);
      assert.equal(savings!.balanceVnd, 10_000);
      // Rút quá → reject.
      await assert.rejects(
        createTransfer(getPool(), {
          userId,
          direction: "withdraw",
          amountVnd: 50_000,
          note: "",
          idempotencyKey: randomUUID(),
          requestHash: canonicalHash({ direction: "withdraw", amountVnd: 50_000 }),
        }),
        expectCode("INSUFFICIENT_SAVINGS_BALANCE"),
      );
      // Savings transfer không phải income/payment trong report.
      const month = currentMonthKey();
      const report = await monthlyReport(getPool(), userId, month);
      assert.equal(report.totalIncomeVnd + report.totalPaymentVnd, 0);
      const transfers = await listTransfers(getPool(), userId, undefined, 20);
      assert.equal(transfers.data.length, 2);
    });
  });

  describe("budget warning-only", () => {
    test("vượt budget vẫn commit payment khi wallet đủ; used/limit đúng", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 500_000);
      const month = currentMonthKey();
      const budgetBody = { categoryId: 5, month, limitVnd: 200_000 };
      await upsertUserBudget(getPool(), {
        userId,
        ...budgetBody,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash(budgetBody),
      });
      const first = await createTx(userId, "payment", 150_000, 5);
      assert.equal(first.budgetWarning.isOverrun, false);
      assert.equal(first.budgetWarning.usedVnd, 150_000);
      const second = await createTx(userId, "payment", 100_000, 5);
      assert.equal(second.budgetWarning.isOverrun, true);
      assert.equal(second.budgetWarning.usedVnd, 250_000);
      const wallet = await getWalletFor(userId);
      assert.equal(wallet.availableBalanceVnd, 250_000); // không bị chặn vì vượt budget
      const budgets = await listMonthBudgets(getPool(), userId, month);
      assert.equal(budgets.length, 1);
      assert.equal(budgets[0]!.isOverrun, true);
      const summary = await monthBudgetSummary(getPool(), userId, month);
      assert.equal(summary.exceededCategoryCount, 1);
      assert.equal(summary.totalUsedVnd, 250_000);
    });

    test("budget upsert retry replays; same key with different body conflicts", async () => {
      const userId = await newUserId();
      const month = currentMonthKey();
      const key = randomUUID();
      const body = { categoryId: 5, month, limitVnd: 200_000 };
      const input = { userId, ...body, idempotencyKey: key, requestHash: canonicalHash(body) };

      const [first, replay] = await Promise.all([
        upsertUserBudget(getPool(), input),
        upsertUserBudget(getPool(), input),
      ]);
      assert.deepEqual(replay, first);
      assert.equal(await auditCountFor(userId, "budget.upsert"), 1);

      await assert.rejects(
        upsertUserBudget(getPool(), {
          ...input,
          limitVnd: 300_000,
          requestHash: canonicalHash({ ...body, limitVnd: 300_000 }),
        }),
        expectCode("IDEMPOTENCY_CONFLICT"),
      );
      const budgets = await listMonthBudgets(getPool(), userId, month);
      assert.equal(budgets.length, 1);
      assert.equal(budgets[0]!.limitVnd, body.limitVnd);
      assert.equal(await auditCountFor(userId, "budget.upsert"), 1);

      const otherUserId = await newUserId();
      const otherOwnerResult = await upsertUserBudget(getPool(), { ...input, userId: otherUserId });
      assert.equal(otherOwnerResult.limitVnd, body.limitVnd);
      assert.equal(await auditCountFor(otherUserId, "budget.upsert"), 1);
      assert.equal((await listMonthBudgets(getPool(), userId, month))[0]!.limitVnd, body.limitVnd);
    });

    test("user cannot create a budget using another owner's custom category", async () => {
      const categoryOwnerId = await newUserId();
      const otherUserId = await newUserId();
      const categoryBody = { nameEn: "Private category", nameVi: "Danh mục riêng", appliesTo: "payment" as const };
      const category = await createCustomCategory(getPool(), {
        userId: categoryOwnerId,
        ...categoryBody,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash(categoryBody),
      });
      assert.notEqual(category, null);
      const month = currentMonthKey();
      await upsertUserBudget(getPool(), {
        userId: categoryOwnerId,
        categoryId: Number(category!.id),
        month,
        limitVnd: 250_000,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ categoryId: category!.id, month, limitVnd: 250_000 }),
      });

      await assert.rejects(
        upsertUserBudget(getPool(), {
          userId: otherUserId,
          categoryId: Number(category!.id),
          month,
          limitVnd: 1,
          idempotencyKey: randomUUID(),
          requestHash: canonicalHash({ categoryId: category!.id, month, limitVnd: 1 }),
        }),
        expectCode("CATEGORY_NOT_FOUND"),
      );

      assert.equal((await listMonthBudgets(getPool(), categoryOwnerId, month))[0]!.limitVnd, 250_000);
      assert.deepEqual(await listMonthBudgets(getPool(), otherUserId, month), []);
    });
  });

  describe("report HCMC", () => {
    test("monthly report deterministic: opening/income/payment/closing", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 500_000);
      await createTx(userId, "income", 100_000, 1);
      await createTx(userId, "payment", 200_000, 5);
      const month = currentMonthKey();
      const report = await monthlyReport(getPool(), userId, month);
      assert.equal(report.openingWalletBalanceVnd, 500_000);
      assert.equal(report.totalIncomeVnd, 100_000);
      assert.equal(report.totalPaymentVnd, 200_000);
      assert.equal(report.closingWalletBalanceVnd, 400_000);
    });

    test("report tháng sau kỳ có delta âm vẫn cho opening không âm", async () => {
      // Delta ledger có dấu; opening vẫn không âm vì savings transfers giữ aggregate non-negative.
      const userId = await newUserId();
      await initWalletFor(userId, 1_000_000);
      const occurredAt = "2026-03-15T03:00:00.000Z";
      const body = { type: "payment" as const, amountVnd: 300_000, categoryId: 5, occurredAt };
      await createTransaction(getPool(), {
        userId,
        type: "payment",
        amountVnd: 300_000,
        categoryId: 5,
        occurredAt,
        description: null,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash(body),
      });
      const report = await monthlyReport(getPool(), userId, "2026-04");
      assert.equal(report.openingWalletBalanceVnd, 700_000);
      assert.ok(report.openingWalletBalanceVnd >= 0);
      assert.equal(report.totalPaymentVnd, 0);
      assert.equal(report.closingWalletBalanceVnd, 700_000);
    });

    test("SQL SUM near unsigned BIGINT maximum stays exact and fails closed at VND boundary", async () => {
      const [rows] = (await getPool().query(
        `SELECT SUM(amount_vnd) AS total FROM (
           SELECT CAST('18446744073709551614' AS UNSIGNED) AS amount_vnd
           UNION ALL
           SELECT CAST('1' AS UNSIGNED) AS amount_vnd
         ) AS amounts`,
      )) as [{ total: number | string }[], unknown];

      assert.equal(String(rows[0]!.total), "18446744073709551615");
      assert.throws(() => amountFromDb(rows[0]!.total), /safe integer range/);
    });
  });

  describe("owner isolation + keyset", () => {
    test("user B không đọc được transaction của user A", async () => {
      const userA = await newUserId();
      await initWalletFor(userA, 500_000);
      const income = await createTx(userA, "income", 50_000, 1);
      const userB = await newUserId();
      await initWalletFor(userB, 100_000);
      assert.equal(await getTransaction(getPool(), userB, Number(income.transaction.id)), null);
      const pageA = await listTransactions(getPool(), userA, { limit: 100 });
      assert.equal(pageA.data.length, 1);
      const pageB = await listTransactions(getPool(), userB, { limit: 100 });
      assert.equal(pageB.data.length, 0);
    });

    test("database rejects cross-owner correction SQL before it can affect reports", async () => {
      const userA = await newUserId();
      const userB = await newUserId();
      await initWalletFor(userA, 1_000_000);
      await initWalletFor(userB, 1_000_000);
      const txA = await createTx(userA, "income", 100_000, 1);
      const targetId = Number(txA.transaction.id);
      const correctionKey = randomUUID();
      const correctionHash = canonicalHash({ targetId });
      await getPool().query(
        `INSERT INTO mutation_idempotency (user_id, scope, idempotency_key, request_hash, response_json)
         VALUES (?, 'ledger.correction', ?, ?, CAST('{}' AS JSON))`,
        [userB, correctionKey, correctionHash],
      );
      const [claimRows] = (await getPool().query(
        "SELECT id FROM mutation_idempotency WHERE user_id = ? AND scope = 'ledger.correction' AND idempotency_key = ?",
        [userB, correctionKey],
      )) as [{ id: number | string }[], unknown];
      await assert.rejects(getPool().query(
        `INSERT INTO ledger_transactions
          (user_id, type, amount_vnd, category_id, occurred_at, role, reference_id, reason, idempotency_id)
         VALUES (?, 'income', 100000, 1, UTC_TIMESTAMP(3), 'reversal', ?, 'cross-owner probe', ?)`,
        [userB, targetId, Number(claimRows[0]!.id)],
      ));
      const reportA = await monthlyReport(getPool(), userA, currentMonthKey());
      assert.equal(reportA.totalIncomeVnd, 100_000);
      await assert.rejects(
        createCorrection(getPool(), {
          userId: userB,
          targetId,
          role: "reversal",
          reason: "cross-owner service probe",
          newAmountVnd: null,
          newCategoryId: null,
          idempotencyKey: randomUUID(),
          requestHash: canonicalHash({ targetId }),
        }),
        expectCode("CORRECTION_TARGET_NOT_FOUND"),
      );
    });

    test("keyset pagination: limit 2 → 2 trang, không trùng, có hasNext", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 1_000_000);
      for (let i = 0; i < 3; i += 1) {
        await createTx(userId, "payment", 10_000, 5);
      }
      const page1 = await listTransactions(getPool(), userId, { limit: 2 });
      assert.equal(page1.data.length, 2);
      assert.equal(page1.meta.hasNext, true);
      assert.notEqual(page1.meta.cursor, null);
      const page2 = await listTransactions(getPool(), userId, { limit: 2, cursor: page1.meta.cursor! });
      assert.equal(page2.data.length, 1);
      assert.equal(page2.meta.hasNext, false);
      const ids = new Set([...page1.data, ...page2.data].map((t) => t.id));
      assert.equal(ids.size, 3);
    });
  });

  describe("append-only guards (trigger)", () => {
    test("UPDATE/DELETE ledger và audit bị chặn ở DB", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 500_000);
      const tx = await createTx(userId, "income", 100_000, 1);
      const conn = await getPool().getConnection();
      try {
        await assert.rejects(
          conn.query(`UPDATE \`${harness.dbName}\`.ledger_transactions SET amount_vnd = 1 WHERE id = ?`, [
            Number(tx.transaction.id),
          ]),
          /append-only/,
        );
        await assert.rejects(
          conn.query(`DELETE FROM \`${harness.dbName}\`.ledger_transactions WHERE id = ?`, [Number(tx.transaction.id)]),
          /append-only/,
        );
        await assert.rejects(
          conn.query(`DELETE FROM \`${harness.dbName}\`.audit_events WHERE user_id = ?`, [userId]),
          /append-only/,
        );
      } finally {
        conn.release();
      }
    });
  });

  }
