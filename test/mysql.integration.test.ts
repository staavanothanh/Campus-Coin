// Integration MySQL — gated: chỉ chạy khi CAMPUS_COIN_TEST_DB=1 và có CAMPUS_COIN_DB_*.
// Tạo database tạm, migrate mọi version hiện có (0001–0010), chạy services thật, drop database sau cùng.
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
import { createCustomCategory, updateUserCategory } from "../src/application/category.service.ts";
import { currentMonthKey } from "../src/domain/period.ts";
import { DomainError } from "../src/domain/errors.ts";
import { authRateLimitRetryAfter, recordAuthFailures } from "../src/features/auth/rate-limit.ts";
import { createUserIssue, listAdminIssues, listUserIssues, getAdminIssue, updateAdminIssue, addAdminIssueNote } from "../src/application/issue.service.ts";
import { updateUserPreferences } from "../src/application/user.service.ts";
import { listAdminAuditLogs } from "../src/application/admin.service.ts";

const ENABLED = process.env["CAMPUS_COIN_TEST_DB"] === "1";

if (!ENABLED) {
  test(
    "MySQL integration suite",
    { skip: "Gated: set CAMPUS_COIN_TEST_DB=1 và CAMPUS_COIN_DB_* để chạy (cần MySQL thật)" },
    () => undefined,
  );
} else {
  const harness = createMysqlHarness();
  process.env["AUTH_RATE_LIMIT_SECRET"] = "local-integration-only-0123456789abcdef";

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

  async function createTx(
    userId: number,
    type: "income" | "payment",
    amountVnd: number,
    categoryId: number,
    occurredAt = new Date().toISOString(),
  ) {
    const body = { type, amountVnd, categoryId, occurredAt };
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

  async function countUserRowsFor(
    table: "mutation_idempotency" | "audit_events" | "savings_transfers",
    userId: number,
  ): Promise<number> {
    const [rows] = (await getPool().query(
      `SELECT COUNT(*) AS n FROM \`${harness.dbName}\`.\`${table}\` WHERE user_id = ?`,
      [userId],
    )) as [{ n: number | string }[], unknown];
    return Number(rows[0]!.n);
  }

  async function assertBalancesMatchHistory(userId: number): Promise<void> {
    const [walletRows] = (await getPool().query(
      `SELECT initial_balance_vnd, available_balance_vnd
       FROM \`${harness.dbName}\`.wallet_accounts WHERE user_id = ?`,
      [userId],
    )) as [{ initial_balance_vnd: number | string; available_balance_vnd: number | string }[], unknown];
    assert.equal(walletRows.length, 1);
    let expectedWallet = BigInt(String(walletRows[0]!.initial_balance_vnd));

    const [ledgerRows] = (await getPool().query(
      `SELECT t.type, t.amount_vnd, t.role, target.amount_vnd AS target_amount_vnd
       FROM \`${harness.dbName}\`.ledger_transactions t
       LEFT JOIN \`${harness.dbName}\`.ledger_transactions target
         ON target.user_id = t.user_id AND target.id = t.reference_id
       WHERE t.user_id = ? ORDER BY t.id`,
      [userId],
    )) as [{
      type: "income" | "payment";
      amount_vnd: number | string;
      role: "original" | "reversal" | "adjustment" | "replacement";
      target_amount_vnd: number | string | null;
    }[], unknown];
    for (const row of ledgerRows) {
      const amount = BigInt(String(row.amount_vnd));
      if (row.role === "original") {
        expectedWallet += row.type === "income" ? amount : -amount;
      } else if (row.role === "reversal") {
        expectedWallet += row.type === "income" ? -amount : amount;
      } else {
        assert.notEqual(row.target_amount_vnd, null);
        const difference = amount - BigInt(String(row.target_amount_vnd));
        expectedWallet += row.type === "income" ? difference : -difference;
      }
    }

    const [transferRows] = (await getPool().query(
      `SELECT direction, amount_vnd FROM \`${harness.dbName}\`.savings_transfers WHERE user_id = ?`,
      [userId],
    )) as [{ direction: "deposit" | "withdraw"; amount_vnd: number | string }[], unknown];
    let expectedSavings = 0n;
    for (const row of transferRows) {
      const amount = BigInt(String(row.amount_vnd));
      expectedWallet += row.direction === "deposit" ? -amount : amount;
      expectedSavings += row.direction === "deposit" ? amount : -amount;
    }

    assert.equal(expectedWallet, BigInt(String(walletRows[0]!.available_balance_vnd)));
    const [savingsRows] = (await getPool().query(
      `SELECT balance_vnd FROM \`${harness.dbName}\`.savings_accounts WHERE user_id = ?`,
      [userId],
    )) as [{ balance_vnd: number | string }[], unknown];
    assert.equal(savingsRows.length, 1);
    assert.equal(expectedSavings, BigInt(String(savingsRows[0]!.balance_vnd)));
  }

  before(async () => {
    await harness.start();
  });

  test("auth rate-limit giữ bucket bền vững và khóa sau ngưỡng", async () => {
    const policy = {
      scope: "login-email-test",
      value: "student@example.test",
      maxAttempts: 2,
      windowMs: 60_000,
      blockMs: 30_000,
    };

    assert.equal(await authRateLimitRetryAfter([policy]), null);
    await recordAuthFailures([policy]);
    assert.equal(await authRateLimitRetryAfter([policy]), null);
    await recordAuthFailures([policy]);
    assert.ok((await authRateLimitRetryAfter([policy]) ?? 0) > 0);
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

  describe("user and issue APIs", () => {
    test("preferences update only fields supplied by owner session", async () => {
      const userId = await newUserId();
      const user = await updateUserPreferences(userId, { displayName: "  Student One  ", locale: "en" });
      assert.equal(user.id, String(userId));
      assert.equal(user.displayName, "Student One");
      assert.equal(user.locale, "en");
    });

    test("issue create is idempotent and user listing stays owner-scoped", async () => {
      const userId = await newUserId();
      const otherUserId = await newUserId();
      const key = randomUUID();
      const body = { title: "Wrong category", description: "A test report", category: "bug" as const };
      const input = {
        userId,
        relatedTransactionId: null,
        ...body,
        idempotencyKey: key,
        requestHash: canonicalHash(body),
      };

      const created = await createUserIssue(getPool(), input);
      const replay = await createUserIssue(getPool(), input);
      assert.equal(replay.id, created.id);
      assert.equal((await listUserIssues(getPool(), userId, undefined, 20)).data.length, 1);
      assert.equal((await listUserIssues(getPool(), otherUserId, undefined, 20)).data.length, 0);

      const differentBody = { ...input, title: "Another title", requestHash: canonicalHash({ ...body, title: "Another title" }) };
      await assert.rejects(createUserIssue(getPool(), differentBody), expectCode("IDEMPOTENCY_CONFLICT"));
    });

    test("admin issue triage and note append events without exposing actor IDs", async () => {
      const userId = await newUserId();
      const adminActorId = await newUserId();
      const body = { title: "Review", description: "Needs a review", category: "other" as const };
      const issue = await createUserIssue(getPool(), {
        userId,
        relatedTransactionId: null,
        ...body,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash(body),
      });
      const issueId = Number(issue.id);
      await updateAdminIssue(adminActorId, issueId, { status: "in_triage", priority: "P1" });
      const noteBody = { note: "Reviewed by support" };
      await addAdminIssueNote(adminActorId, issueId, noteBody.note, randomUUID(), canonicalHash(noteBody));

      const detail = await getAdminIssue(getPool(), issueId);
      assert.equal(detail.status, "in_triage");
      assert.deepEqual(detail.events.map(event => event.kind), ["created", "status_change", "priority_change", "note"]);
      assert.equal("actorUserId" in detail.events[0]!, false);
      assert.ok((await listAdminIssues(getPool(), { limit: 20, status: "in_triage" })).data.some(item => item.id === issue.id));
      assert.ok((await listAdminAuditLogs(undefined, 20)).data.some(event => event.action === "issue.note"));
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

    test("income vượt safe integer boundary bị rollback", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, Number.MAX_SAFE_INTEGER);
      const idempotencyCount = await countUserRowsFor("mutation_idempotency", userId);
      const auditCount = await countUserRowsFor("audit_events", userId);

      await assert.rejects(createTx(userId, "income", 1, 1), expectCode("INVALID_INPUT"));

      assert.equal((await getWalletFor(userId)).availableBalanceVnd, Number.MAX_SAFE_INTEGER);
      assert.equal(await ledgerCountFor(userId), 0);
      assert.equal(await countUserRowsFor("mutation_idempotency", userId), idempotencyCount);
      assert.equal(await countUserRowsFor("audit_events", userId), auditCount);
    });

    test("tổng payment trong tháng vượt safe integer boundary bị từ chối", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, Number.MAX_SAFE_INTEGER);
      await createTx(userId, "payment", Number.MAX_SAFE_INTEGER, 5);
      await createTx(userId, "income", Number.MAX_SAFE_INTEGER, 1);
      const idempotencyCount = await countUserRowsFor("mutation_idempotency", userId);
      const auditCount = await countUserRowsFor("audit_events", userId);

      await assert.rejects(createTx(userId, "payment", 1, 6), expectCode("INVALID_INPUT"));

      assert.equal((await getWalletFor(userId)).availableBalanceVnd, Number.MAX_SAFE_INTEGER);
      assert.equal(await ledgerCountFor(userId), 2);
      assert.equal(await countUserRowsFor("mutation_idempotency", userId), idempotencyCount);
      assert.equal(await countUserRowsFor("audit_events", userId), auditCount);
      assert.equal((await monthlyReport(getPool(), userId, currentMonthKey())).totalPaymentVnd, Number.MAX_SAFE_INTEGER);
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
      await assert.rejects(
        createTx(userId, "payment", 10_000, Number(created!.id)),
        expectCode("CATEGORY_DISABLED"),
      );
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

    test("adjustment vượt safe integer boundary bị rollback", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, Number.MAX_SAFE_INTEGER - 100);
      const income = await createTx(userId, "income", 100, 1);
      const idempotencyCount = await countUserRowsFor("mutation_idempotency", userId);
      const auditCount = await countUserRowsFor("audit_events", userId);

      await assert.rejects(
        createCorrection(getPool(), {
          userId,
          targetId: Number(income.transaction.id),
          role: "adjustment",
          reason: "safe integer boundary test",
          newAmountVnd: 101,
          newCategoryId: null,
          idempotencyKey: randomUUID(),
          requestHash: canonicalHash({ targetId: income.transaction.id, role: "adjustment", newAmountVnd: 101 }),
        }),
        expectCode("INVALID_INPUT"),
      );

      assert.equal((await getWalletFor(userId)).availableBalanceVnd, Number.MAX_SAFE_INTEGER);
      assert.equal(await ledgerCountFor(userId), 1);
      assert.equal(await countUserRowsFor("mutation_idempotency", userId), idempotencyCount);
      assert.equal(await countUserRowsFor("audit_events", userId), auditCount);
    });

    test("correction không được làm tổng payment tháng vượt safe integer boundary", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, Number.MAX_SAFE_INTEGER);
      await createTx(userId, "payment", Number.MAX_SAFE_INTEGER - 1, 5);
      const smallPayment = await createTx(userId, "payment", 1, 5);
      await createTx(userId, "income", Number.MAX_SAFE_INTEGER, 1);
      const idempotencyCount = await countUserRowsFor("mutation_idempotency", userId);
      const auditCount = await countUserRowsFor("audit_events", userId);

      await assert.rejects(
        createCorrection(getPool(), {
          userId,
          targetId: Number(smallPayment.transaction.id),
          role: "adjustment",
          reason: "monthly safe integer boundary test",
          newAmountVnd: 2,
          newCategoryId: null,
          idempotencyKey: randomUUID(),
          requestHash: canonicalHash({ targetId: smallPayment.transaction.id, role: "adjustment", newAmountVnd: 2 }),
        }),
        expectCode("INVALID_INPUT"),
      );

      assert.equal((await getWalletFor(userId)).availableBalanceVnd, Number.MAX_SAFE_INTEGER);
      assert.equal(await ledgerCountFor(userId), 3);
      assert.equal(await countUserRowsFor("mutation_idempotency", userId), idempotencyCount);
      assert.equal(await countUserRowsFor("audit_events", userId), auditCount);
    });
  });

  describe("savings", () => {
    test("deposit or withdrawal that overflows a balance is rejected atomically", async () => {
      const depositUserId = await newUserId();
      await initWalletFor(depositUserId, 1);
      await getPool().query(
        `UPDATE \`${harness.dbName}\`.savings_accounts SET balance_vnd = ? WHERE user_id = ?`,
        [Number.MAX_SAFE_INTEGER, depositUserId],
      );
      const depositIdempotencyCount = await countUserRowsFor("mutation_idempotency", depositUserId);
      const depositAuditCount = await countUserRowsFor("audit_events", depositUserId);
      const depositTransferCount = await countUserRowsFor("savings_transfers", depositUserId);

      await assert.rejects(
        createTransfer(getPool(), {
          userId: depositUserId,
          direction: "deposit",
          amountVnd: 1,
          note: null,
          idempotencyKey: randomUUID(),
          requestHash: canonicalHash({ direction: "deposit", amountVnd: 1 }),
        }),
        expectCode("INVALID_INPUT"),
      );
      assert.equal((await getWalletFor(depositUserId)).availableBalanceVnd, 1);
      assert.equal((await getSavings(getPool(), depositUserId))?.balanceVnd, Number.MAX_SAFE_INTEGER);
      assert.equal(await countUserRowsFor("mutation_idempotency", depositUserId), depositIdempotencyCount);
      assert.equal(await countUserRowsFor("audit_events", depositUserId), depositAuditCount);
      assert.equal(await countUserRowsFor("savings_transfers", depositUserId), depositTransferCount);

      const withdrawUserId = await newUserId();
      await initWalletFor(withdrawUserId, Number.MAX_SAFE_INTEGER);
      await getPool().query(
        `UPDATE \`${harness.dbName}\`.savings_accounts SET balance_vnd = ? WHERE user_id = ?`,
        [1, withdrawUserId],
      );
      const withdrawIdempotencyCount = await countUserRowsFor("mutation_idempotency", withdrawUserId);
      const withdrawAuditCount = await countUserRowsFor("audit_events", withdrawUserId);
      const withdrawTransferCount = await countUserRowsFor("savings_transfers", withdrawUserId);

      await assert.rejects(
        createTransfer(getPool(), {
          userId: withdrawUserId,
          direction: "withdraw",
          amountVnd: 1,
          note: null,
          idempotencyKey: randomUUID(),
          requestHash: canonicalHash({ direction: "withdraw", amountVnd: 1 }),
        }),
        expectCode("INVALID_INPUT"),
      );
      assert.equal((await getWalletFor(withdrawUserId)).availableBalanceVnd, Number.MAX_SAFE_INTEGER);
      assert.equal((await getSavings(getPool(), withdrawUserId))?.balanceVnd, 1);
      assert.equal(await countUserRowsFor("mutation_idempotency", withdrawUserId), withdrawIdempotencyCount);
      assert.equal(await countUserRowsFor("audit_events", withdrawUserId), withdrawAuditCount);
      assert.equal(await countUserRowsFor("savings_transfers", withdrawUserId), withdrawTransferCount);
    });

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

    test("wallet và savings projection khớp lịch sử ledger và transfer", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 100_000);
      await createTx(userId, "income", 50_000, 1);
      const payment = await createTx(userId, "payment", 20_000, 5);
      await createCorrection(getPool(), {
        userId,
        targetId: Number(payment.transaction.id),
        role: "reversal",
        reason: "reconciliation test",
        newAmountVnd: null,
        newCategoryId: null,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ targetId: payment.transaction.id, role: "reversal" }),
      });
      await createTransfer(getPool(), {
        userId,
        direction: "deposit",
        amountVnd: 30_000,
        note: null,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ direction: "deposit", amountVnd: 30_000 }),
      });
      await createTransfer(getPool(), {
        userId,
        direction: "withdraw",
        amountVnd: 5_000,
        note: null,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ direction: "withdraw", amountVnd: 5_000 }),
      });

      await assertBalancesMatchHistory(userId);
      assert.equal((await getWalletFor(userId)).availableBalanceVnd, 125_000);
      assert.equal((await getSavings(getPool(), userId))?.balanceVnd, 25_000);
    });
  });

  describe("budget warning-only", () => {
    test("vượt budget vẫn commit payment khi wallet đủ; used/limit đúng", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 500_000);
      const month = currentMonthKey();
      await upsertUserBudget(getPool(), {
        userId,
        categoryId: 5,
        month,
        limitVnd: 200_000,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ categoryId: 5, month, limitVnd: 200_000 }),
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

    test("budget upsert từ chối tổng limit tháng vượt safe integer boundary", async () => {
      const userId = await newUserId();
      const month = currentMonthKey();
      const [rows] = (await getPool().query(
        `SELECT id FROM \`${harness.dbName}\`.categories WHERE is_default = 1 AND applies_to = 'payment' ORDER BY id LIMIT 2`,
      )) as [{ id: number | string }[], unknown];
      assert.equal(rows.length, 2);

      const firstCategoryId = Number(rows[0]!.id);
      const secondCategoryId = Number(rows[1]!.id);
      await upsertUserBudget(getPool(), {
        userId,
        categoryId: firstCategoryId,
        month,
        limitVnd: Number.MAX_SAFE_INTEGER,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ categoryId: firstCategoryId, month, limitVnd: Number.MAX_SAFE_INTEGER }),
      });

      await assert.rejects(
        upsertUserBudget(getPool(), {
          userId,
          categoryId: secondCategoryId,
          month,
          limitVnd: 1,
          idempotencyKey: randomUUID(),
          requestHash: canonicalHash({ categoryId: secondCategoryId, month, limitVnd: 1 }),
        }),
        expectCode("INVALID_INPUT"),
      );
      const summary = await monthBudgetSummary(getPool(), userId, month);
      assert.equal(summary.totalLimitVnd, Number.MAX_SAFE_INTEGER);
    });

    test("budget upsert đồng thời vẫn giữ tổng limit trong safe integer boundary", async () => {
      const userId = await newUserId();
      const month = currentMonthKey();
      const [rows] = (await getPool().query(
        `SELECT id FROM \`${harness.dbName}\`.categories WHERE is_default = 1 AND applies_to = 'payment' ORDER BY id LIMIT 2`,
      )) as [{ id: number | string }[], unknown];
      assert.equal(rows.length, 2);
      const firstCategoryId = Number(rows[0]!.id);
      const secondCategoryId = Number(rows[1]!.id);
      const results = await Promise.allSettled([
        upsertUserBudget(getPool(), {
          userId,
          categoryId: firstCategoryId,
          month,
          limitVnd: Number.MAX_SAFE_INTEGER,
          idempotencyKey: randomUUID(),
          requestHash: canonicalHash({ categoryId: firstCategoryId, month, limitVnd: Number.MAX_SAFE_INTEGER }),
        }),
        upsertUserBudget(getPool(), {
          userId,
          categoryId: secondCategoryId,
          month,
          limitVnd: 1,
          idempotencyKey: randomUUID(),
          requestHash: canonicalHash({ categoryId: secondCategoryId, month, limitVnd: 1 }),
        }),
      ]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      const rejected = results.find((result) => result.status === "rejected");
      assert.ok(rejected?.status === "rejected");
      assert.ok(expectCode("INVALID_INPUT")(rejected.reason), String(rejected.reason));
      assert.ok((await monthBudgetSummary(getPool(), userId, month)).totalLimitVnd <= Number.MAX_SAFE_INTEGER);
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

    test("report tháng sau kỳ chi vượt thu: opening âm hợp lệ, không throw", async () => {
      // Regression: delta trước kỳ là số CÓ DẤU; amountFromDb chặn số âm từng làm
      // monthlyReport throw "db amount out of safe integer range" cho mọi kỳ sau.
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
      assert.equal(report.totalPaymentVnd, 0);
      assert.equal(report.closingWalletBalanceVnd, 700_000);
    });

    test("từ chối giao dịch nhập lùi ngày làm opening report vượt safe integer", async () => {
      const userId = await newUserId();
      await initWalletFor(userId, 0);
      await createTx(userId, "income", Number.MAX_SAFE_INTEGER, 1, "2026-04-15T03:00:00.000Z");
      await createTx(userId, "payment", Number.MAX_SAFE_INTEGER, 5, "2026-01-15T03:00:00.000Z");
      await createTx(userId, "income", Number.MAX_SAFE_INTEGER, 1, "2026-05-15T03:00:00.000Z");

      const ledgerCount = await ledgerCountFor(userId);
      const idempotencyCount = await countUserRowsFor("mutation_idempotency", userId);
      const auditCount = await countUserRowsFor("audit_events", userId);
      await assert.rejects(
        createTx(userId, "payment", Number.MAX_SAFE_INTEGER, 5, "2026-02-15T03:00:00.000Z"),
        expectCode("INVALID_INPUT"),
      );

      assert.equal((await getWalletFor(userId)).availableBalanceVnd, Number.MAX_SAFE_INTEGER);
      assert.equal(await ledgerCountFor(userId), ledgerCount);
      assert.equal(await countUserRowsFor("mutation_idempotency", userId), idempotencyCount);
      assert.equal(await countUserRowsFor("audit_events", userId), auditCount);
      const februaryReport = await monthlyReport(getPool(), userId, "2026-02");
      assert.equal(februaryReport.openingWalletBalanceVnd, -Number.MAX_SAFE_INTEGER);
      assert.equal(februaryReport.closingWalletBalanceVnd, -Number.MAX_SAFE_INTEGER);
      assert.equal((await monthlyReport(getPool(), userId, "2026-05")).closingWalletBalanceVnd, Number.MAX_SAFE_INTEGER);
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

    test("report owner-scope: correction của owner khác không loại row của owner này", async () => {
      // Regression cho antijoin owner-scoped (index idx_ledger_user_reference).
      // Service chặn correction chéo owner, nên dựng trạng thái này ở tầng DB:
      // một correction của B trỏ tới đúng id của row thuộc A. Semantics đúng:
      // report A vẫn tính row đó (correction thuộc owner khác).
      const userA = await newUserId();
      const userB = await newUserId();
      await initWalletFor(userA, 1_000_000);
      await initWalletFor(userB, 1_000_000);
      const txA = await createTx(userA, "income", 100_000, 1);
      const txB = await createTx(userB, "income", 50_000, 1);
      const targetId = Number(txA.transaction.id);
      await getPool().query(
        `INSERT INTO ledger_transactions (user_id, type, amount_vnd, category_id, occurred_at, role, reference_id, reason)
         VALUES (?, 'income', 100000, 1, UTC_TIMESTAMP(3), 'reversal', ?, 'cross-owner probe')`,
        [userB, targetId],
      );
      const month = currentMonthKey();
      const reportA = await monthlyReport(getPool(), userA, month);
      assert.equal(reportA.totalIncomeVnd, 100_000, "correction của B không được loại row của A");
      const reportB = await monthlyReport(getPool(), userB, month);
      assert.equal(reportB.totalIncomeVnd, 50_000, "B vẫn giữ income của chính mình");
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
