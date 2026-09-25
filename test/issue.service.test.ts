import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createUserIssue, getIssueForAdmin, getUserIssue, listAllIssuesForAdmin, listIssueEventsForAdmin, listUserIssueEvents, listUserIssues, updateIssueForAdmin, updateUserIssue, addAdminIssueNote } from "../src/application/issue.service.ts";
import { createTransaction } from "../src/application/ledger.service.ts";
import { initializeWallet } from "../src/application/wallet.service.ts";
import { DomainError } from "../src/domain/errors.ts";
import type { Db } from "../src/infrastructure/db/pool.ts";
import { getPool } from "../src/infrastructure/db/pool.ts";
import { canonicalHash } from "../src/lib/hash.ts";
import { createMysqlHarness } from "./helpers/mysql-harness.ts";

const ENABLED = process.env["CAMPUS_COIN_TEST_DB"] === "1";
const noDb: Db = {
  query: async () => {
    throw new Error("database must not be accessed before admin role authorization");
  },
} as unknown as Db;
const nonAdmin = { userId: 1, role: "user" as const };

function expectCode(code: string) {
  return (error: unknown): boolean => error instanceof DomainError && error.code === code;
}

test("admin-wide issue service methods reject non-admin actors before database access", async () => {
  await assert.rejects(listAllIssuesForAdmin(noDb, nonAdmin), expectCode("FORBIDDEN"));
  await assert.rejects(getIssueForAdmin(noDb, nonAdmin, 1), expectCode("FORBIDDEN"));
  await assert.rejects(listIssueEventsForAdmin(noDb, nonAdmin, 1), expectCode("FORBIDDEN"));
  await assert.rejects(updateIssueForAdmin(noDb, { actor: nonAdmin, issueId: 1, status: "closed" }), expectCode("FORBIDDEN"));
  await assert.rejects(
    addAdminIssueNote(noDb, {
      actor: nonAdmin,
      issueId: 1,
      note: "internal note",
      idempotencyKey: randomUUID(),
      requestHash: canonicalHash({ note: "internal note" }),
    }),
    expectCode("FORBIDDEN"),
  );
});

if (!ENABLED) {
  test("Issue service MySQL integration", { skip: "Gated: set CAMPUS_COIN_TEST_DB=1 and CAMPUS_COIN_DB_* to run against MySQL" }, () => undefined);
} else {
  const harness = createMysqlHarness();

  async function newUserId(): Promise<number> {
    return harness.newUserId();
  }

  async function newUserWithIncome(): Promise<{ userId: number; transactionId: number }> {
    const userId = await newUserId();
    await initializeWallet(getPool(), {
      userId,
      initialBalanceVnd: 100_000,
      idempotencyKey: randomUUID(),
      requestHash: canonicalHash({ initialBalanceVnd: 100_000 }),
    });
    const transaction = await createTransaction(getPool(), {
      userId,
      type: "income",
      amountVnd: 50_000,
      categoryId: 1,
      occurredAt: new Date().toISOString(),
      description: null,
      idempotencyKey: randomUUID(),
      requestHash: canonicalHash({ type: "income", amountVnd: 50_000 }),
    });
    return { userId, transactionId: Number(transaction.transaction.id) };
  }

  async function countRows(table: "issues" | "issue_events" | "audit_events", predicate: string, params: unknown[]): Promise<number> {
    const [rows] = (await getPool().query(`SELECT COUNT(*) AS n FROM ${table} WHERE ${predicate}`, params)) as [
      { n: number | string }[],
      unknown,
    ];
    return Number(rows[0]!.n);
  }

  before(async () => {
    await harness.start();
  });

  after(async () => {
    await harness.stop();
  });

  describe("issue owner and event boundaries", () => {
    test("create validates related transaction ownership and scopes reads, updates, and events", async () => {
      const { userId: ownerId, transactionId } = await newUserWithIncome();
      const otherUserId = await newUserId();
      const badCreate = createUserIssue(getPool(), {
        userId: otherUserId,
        relatedTransactionId: transactionId,
        title: "Wrong owner transaction",
        description: "The related transaction belongs to someone else.",
        category: "financial_dispute",
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ relatedTransactionId: transactionId }),
      });
      await assert.rejects(badCreate, expectCode("NOT_FOUND"));
      assert.equal(await countRows("issues", "user_id = ?", [otherUserId]), 0);

      const issue = await createUserIssue(getPool(), {
        userId: ownerId,
        relatedTransactionId: transactionId,
        title: "Income question",
        description: "Please review this transaction.",
        category: "financial_dispute",
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ relatedTransactionId: transactionId, title: "Income question" }),
      });
      assert.deepEqual(Object.keys(issue).sort(), ["createdAt", "description", "id", "priority", "status", "title"]);
      const [relatedRows] = (await getPool().query("SELECT related_transaction_id FROM issues WHERE id = ?", [issue.id])) as [
        { related_transaction_id: number | string | null }[],
        unknown,
      ];
      assert.equal(Number(relatedRows[0]!.related_transaction_id), transactionId);
      assert.equal((await getUserIssue(getPool(), ownerId, Number(issue.id))).id, issue.id);
      assert.deepEqual((await listUserIssues(getPool(), ownerId, { limit: 10 })).data.map((row) => row.id), [issue.id]);
      assert.deepEqual((await listUserIssues(getPool(), otherUserId, { limit: 10 })).data, []);
      await assert.rejects(getUserIssue(getPool(), otherUserId, Number(issue.id)), expectCode("NOT_FOUND"));
      await assert.rejects(
        updateUserIssue(getPool(), { userId: otherUserId, issueId: Number(issue.id), title: "Cross-owner update" }),
        expectCode("NOT_FOUND"),
      );
      assert.equal((await getUserIssue(getPool(), ownerId, Number(issue.id))).title, "Income question");
      assert.equal((await listUserIssueEvents(getPool(), ownerId, Number(issue.id))).length, 1);
      await assert.rejects(listUserIssueEvents(getPool(), otherUserId, Number(issue.id)), expectCode("NOT_FOUND"));

      const updated = await updateUserIssue(getPool(), {
        userId: ownerId,
        issueId: Number(issue.id),
        title: "Updated question",
      });
      assert.equal(updated.title, "Updated question");
      assert.equal((await listUserIssueEvents(getPool(), ownerId, Number(issue.id))).some((event) => event.kind === "reporter_update"), true);
    });

    test("create and admin note replay atomically; triage appends changed event(s) and audits", async () => {
      const userId = await newUserId();
      const adminUserId = await newUserId();
      const createBody = { title: "App issue", description: "The view did not load.", category: "bug" as const };
      const createInput = {
        userId,
        relatedTransactionId: null,
        ...createBody,
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash(createBody),
      };
      const first = await createUserIssue(getPool(), createInput);
      const replay = await createUserIssue(getPool(), createInput);
      assert.deepEqual(replay, first);
      await assert.rejects(
        createUserIssue(getPool(), {
          ...createInput,
          title: "Other",
          requestHash: canonicalHash({ ...createBody, title: "Other" }),
        }),
        expectCode("IDEMPOTENCY_CONFLICT"),
      );
      assert.equal(await countRows("issues", "user_id = ?", [userId]), 1);
      assert.equal(await countRows("issue_events", "issue_id = ?", [first.id]), 1);
      assert.equal(await countRows("audit_events", "user_id = ? AND action = 'issue.create'", [userId]), 1);

      const actor = { userId: adminUserId, role: "admin" as const };
      const updated = await updateIssueForAdmin(getPool(), {
        actor,
        issueId: Number(first.id),
        status: "in_triage",
        priority: "P1",
      });
      assert.equal(updated.status, "in_triage");
      assert.equal(updated.priority, "P1");
      assert.deepEqual(
        await updateIssueForAdmin(getPool(), { actor, issueId: Number(first.id), status: "in_triage", priority: "P1" }),
        updated,
      );
      assert.equal(await countRows("issue_events", "issue_id = ? AND kind IN ('status_change', 'priority_change')", [first.id]), 2);
      assert.equal(await countRows("audit_events", "user_id = ? AND action = 'issue.triage.update'", [userId]), 1);

      const noteInput = {
        actor,
        issueId: Number(first.id),
        note: "Asked the reporter to retry.",
        idempotencyKey: randomUUID(),
        requestHash: canonicalHash({ issueId: first.id, note: "Asked the reporter to retry." }),
      };
      const note = await addAdminIssueNote(getPool(), noteInput);
      assert.deepEqual(await addAdminIssueNote(getPool(), noteInput), note);
      await assert.rejects(
        addAdminIssueNote(getPool(), { ...noteInput, note: "Different note", requestHash: canonicalHash({ note: "Different note" }) }),
        expectCode("IDEMPOTENCY_CONFLICT"),
      );
      assert.equal(await countRows("issue_events", "issue_id = ? AND kind = 'note'", [first.id]), 1);
      assert.equal(await countRows("audit_events", "user_id = ? AND action = 'issue.note.create'", [userId]), 1);
      assert.equal((await listUserIssueEvents(getPool(), userId, Number(first.id))).some((event) => event.kind === "note"), false);
      assert.equal((await listIssueEventsForAdmin(getPool(), actor, Number(first.id))).some((event) => event.id === note.id), true);
      assert.equal((await getIssueForAdmin(getPool(), actor, Number(first.id))).id, first.id);
    });
  });
}
