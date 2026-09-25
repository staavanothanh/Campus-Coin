// Wallet service: baseline một lần (không phải income), wallet + savings tạo atomic.

import type { Db } from "../infrastructure/db/pool.js";
import { withIdempotentMutation } from "./idempotency.js";
import { amountFromDb } from "../infrastructure/persistence/rows.js";
import { findWalletByUserId, insertWallet } from "../infrastructure/persistence/wallet.repository.js";
import { insertAuditEvent } from "../infrastructure/persistence/audit.repository.js";
import { isNonNegativeVnd } from "../domain/money.js";
import { invalidInput, walletAlreadyInitialized } from "../domain/errors.js";
import { toWallet, type WalletView } from "./map.js";

export async function getWallet(db: Db, userId: number): Promise<WalletView | null> {
  const row = await findWalletByUserId(db, userId);
  return row === null ? null : toWallet(row);
}

export interface InitializeWalletInput {
  userId: number;
  initialBalanceVnd: number;
  idempotencyKey: string;
  requestHash: string;
}

export async function initializeWallet(
  db: Db,
  input: InitializeWalletInput,
): Promise<WalletView> {
  if (!isNonNegativeVnd(input.initialBalanceVnd)) {
    throw invalidInput("initialBalanceVnd must be a non-negative integer VND");
  }
  return withIdempotentMutation({
    db,
    userId: input.userId,
    scope: "wallet.baseline",
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    mutate: async (conn, idempotencyId) => {
      const existing = await findWalletByUserId(conn, input.userId);
      if (existing !== null) throw walletAlreadyInitialized();
      await insertWallet(conn, input.userId, input.initialBalanceVnd, idempotencyId);
      await insertAuditEvent(conn, {
        userId: input.userId,
        actorType: "user",
        actorUserId: input.userId,
        action: "wallet.initialize",
        scope: "wallet",
        targetId: null,
        outcome: "success",
      });
      const created = await findWalletByUserId(conn, input.userId);
      if (created === null) throw new Error("wallet missing after insert");
      return toWallet(created);
    },
  });
}

/** Đọc số dư khởi tạo (dùng cho report opening). */
export async function initialBalanceOf(db: Db, userId: number): Promise<number> {
  const row = await findWalletByUserId(db, userId);
  if (row === null) {
    throw new Error("wallet not initialized"); // report chỉ gọi khi wallet tồn tại
  }
  return amountFromDb(row.initialBalanceVnd);
}
