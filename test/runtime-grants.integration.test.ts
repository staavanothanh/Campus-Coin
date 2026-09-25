import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPool } from "../src/infrastructure/db/pool.js";
import { createMysqlHarness } from "./helpers/mysql-harness.js";
import { createTransaction } from "../src/application/ledger.service.js";
import { initializeWallet } from "../src/application/wallet.service.js";
import { canonicalHash } from "../src/lib/hash.js";
import { createCustomCategory } from "../src/application/category.service.js";

const ENABLED = process.env["CAMPUS_COIN_TEST_DB"] === "1";

if (!ENABLED) {
  test("runtime database grants", { skip: "Gated: use npm run test:mysql:required with an isolated MySQL server" }, () => undefined);
} else {
  const harness = createMysqlHarness();

  before(async () => harness.start());
  after(async () => harness.stop());

  test("restricted runtime role can use services but cannot DDL or create cross-owner financial references", async () => {
    const triggerDefiners = await harness.listTriggerDefiners();
    assert.ok(triggerDefiners.length > 0);
    assert.deepEqual([...new Set(triggerDefiners)], [`${harness.migrationUser}@%`]);

    const ownerId = await harness.newUserId();
    const otherOwnerId = await harness.newUserId();
    await initializeWallet(getPool(), {
      userId: ownerId,
      initialBalanceVnd: 100_000,
      idempotencyKey: randomUUID(),
      requestHash: canonicalHash({ initialBalanceVnd: 100_000 }),
    });
    const transaction = await createTransaction(getPool(), {
      userId: ownerId,
      type: "income",
      amountVnd: 10_000,
      categoryId: 1,
      occurredAt: new Date().toISOString(),
      description: null,
      idempotencyKey: randomUUID(),
      requestHash: canonicalHash({ ownerId, amountVnd: 10_000 }),
    });

    const paymentKey = randomUUID();
    await getPool().query(
      `INSERT INTO mutation_idempotency (user_id, scope, idempotency_key, request_hash, response_json)
       VALUES (?, 'ledger.create', ?, ?, CAST('{}' AS JSON))`,
      [ownerId, paymentKey, canonicalHash({ type: "payment", amountVnd: 110_001, categoryId: 5 })],
    );
    const [paymentClaimRows] = (await getPool().query(
      "SELECT id FROM mutation_idempotency WHERE user_id = ? AND scope = 'ledger.create' AND idempotency_key = ?",
      [ownerId, paymentKey],
    )) as [{ id: number | string }[], unknown];
    await assert.rejects(
      getPool().query(
        `INSERT INTO ledger_transactions (user_id, type, amount_vnd, category_id, occurred_at, role, idempotency_id)
         VALUES (?, 'payment', 110001, 5, UTC_TIMESTAMP(3), 'original', ?)`,
        [ownerId, Number(paymentClaimRows[0]!.id)],
      ),
    );

    const withdrawKey = randomUUID();
    await getPool().query(
      `INSERT INTO mutation_idempotency (user_id, scope, idempotency_key, request_hash, response_json)
       VALUES (?, 'savings.transfer', ?, ?, CAST('{}' AS JSON))`,
      [ownerId, withdrawKey, canonicalHash({ direction: "withdraw", amountVnd: 1 })],
    );
    const [withdrawClaimRows] = (await getPool().query(
      "SELECT id FROM mutation_idempotency WHERE user_id = ? AND scope = 'savings.transfer' AND idempotency_key = ?",
      [ownerId, withdrawKey],
    )) as [{ id: number | string }[], unknown];
    await assert.rejects(
      getPool().query(
        `INSERT INTO savings_transfers (user_id, direction, amount_vnd, idempotency_id)
         VALUES (?, 'withdraw', 1, ?)`,
        [ownerId, Number(withdrawClaimRows[0]!.id)],
      ),
    );

    const customCategory = await createCustomCategory(getPool(), {
      userId: ownerId,
      nameEn: `Private ${randomUUID()}`,
      nameVi: "Riêng",
      appliesTo: "payment",
      idempotencyKey: randomUUID(),
      requestHash: canonicalHash({ ownerId, category: "private" }),
    });
    assert.ok(customCategory !== null);

    await assert.rejects(getPool().query("CREATE TABLE privilege_probe (id INT PRIMARY KEY)"));
    // Runtime có UPDATE(description) trên ledger chỉ để SELECT ... FOR UPDATE lock row;
    // mọi UPDATE trực tiếp vẫn bị append-only trigger chặn.
    await assert.rejects(
      getPool().query("UPDATE ledger_transactions SET description = 'forged' WHERE id = ?", [
        Number(transaction.transaction.id),
      ]),
      /append-only/,
    );
    await assert.rejects(
      getPool().query(
        `INSERT INTO categories (user_id, name_en, name_vi, applies_to, status, is_default)
         VALUES (NULL, 'Injected system category', 'Danh mục giả', 'payment', 'active', 1)`,
      ),
    );
    await assert.rejects(getPool().query(
      "UPDATE wallet_accounts SET available_balance_vnd = 1 WHERE user_id = ?",
      [ownerId],
    ));
    await assert.rejects(getPool().query(
      "UPDATE savings_accounts SET balance_vnd = 1 WHERE user_id = ?",
      [ownerId],
    ));
    await assert.rejects(getPool().query("SELECT id FROM db_operation_logs LIMIT 1"));
    await assert.rejects(getPool().query(
      `INSERT INTO db_operation_logs
        (operation_id, project_key, environment_key, operation, outcome, migration_version, duration_ms)
       VALUES (?, 'forged', 'staging', 'restore', 'success', NULL, 1)`,
      [randomUUID()],
    ));

    const issueKey = randomUUID();
    const issueHash = canonicalHash({ relatedTransactionId: transaction.transaction.id });
    await getPool().query(
      `INSERT INTO mutation_idempotency (user_id, scope, idempotency_key, request_hash, response_json)
       VALUES (?, 'issue.create', ?, ?, CAST('{}' AS JSON))`,
      [otherOwnerId, issueKey, issueHash],
    );
    const [issueClaimRows] = (await getPool().query(
      "SELECT id FROM mutation_idempotency WHERE user_id = ? AND scope = 'issue.create' AND idempotency_key = ?",
      [otherOwnerId, issueKey],
    )) as [{ id: number | string }[], unknown];

    await assert.rejects(
      getPool().query(
        `INSERT INTO issues (user_id, related_transaction_id, title, description, category, idempotency_id)
         VALUES (?, ?, 'Cross-owner probe', 'Must be rejected', 'financial_dispute', ?)`,
        [otherOwnerId, Number(transaction.transaction.id), Number(issueClaimRows[0]!.id)],
      ),
    );

    const otherKey = randomUUID();
    const otherHash = canonicalHash({ type: "payment", amountVnd: 1, categoryId: 5 });
    await getPool().query(
      `INSERT INTO mutation_idempotency (user_id, scope, idempotency_key, request_hash, response_json)
       VALUES (?, 'ledger.correction', ?, ?, CAST('{}' AS JSON))`,
      [otherOwnerId, otherKey, otherHash],
    );
    const [claimRows] = (await getPool().query(
      "SELECT id FROM mutation_idempotency WHERE user_id = ? AND scope = 'ledger.correction' AND idempotency_key = ?",
      [otherOwnerId, otherKey],
    )) as [{ id: number | string }[], unknown];
    const claimId = Number(claimRows[0]!.id);

    await assert.rejects(
      getPool().query(
        `INSERT INTO ledger_transactions
          (user_id, type, amount_vnd, category_id, occurred_at, role, reference_id, reason, idempotency_id)
         VALUES (?, 'income', 1, 1, UTC_TIMESTAMP(3), 'reversal', ?, 'cross-owner probe', ?)`,
        [otherOwnerId, Number(transaction.transaction.id), claimId],
      ),
    );

    const categoryKey = randomUUID();
    const categoryHash = canonicalHash({ type: "payment", categoryId: customCategory.id });
    await getPool().query(
      `INSERT INTO mutation_idempotency (user_id, scope, idempotency_key, request_hash, response_json)
       VALUES (?, 'ledger.create', ?, ?, CAST('{}' AS JSON))`,
      [otherOwnerId, categoryKey, categoryHash],
    );
    const [categoryClaimRows] = (await getPool().query(
      "SELECT id FROM mutation_idempotency WHERE user_id = ? AND scope = 'ledger.create' AND idempotency_key = ?",
      [otherOwnerId, categoryKey],
    )) as [{ id: number | string }[], unknown];
    await assert.rejects(
      getPool().query(
        `INSERT INTO ledger_transactions (user_id, type, amount_vnd, category_id, occurred_at, role, idempotency_id)
         VALUES (?, 'payment', 1, ?, UTC_TIMESTAMP(3), 'original', ?)`,
        [otherOwnerId, customCategory.id, Number(categoryClaimRows[0]!.id)],
      ),
    );

    const [walletRows] = (await getPool().query(
      "SELECT available_balance_vnd FROM wallet_accounts WHERE user_id = ?",
      [ownerId],
    )) as [{ available_balance_vnd: number | string }[], unknown];
    assert.equal(Number(walletRows[0]!.available_balance_vnd), 110_000);
  });
}
