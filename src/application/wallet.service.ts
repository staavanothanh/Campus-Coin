// Wallet service: baseline một lần (không phải income), wallet + savings tạo atomic.

import type { Db } from "../infrastructure/db/pool.ts";
import { withIdempotentMutation } from "./idempotency.ts";
import { amountFromDb } from "../infrastructure/persistence/rows.ts";
import { findWalletByUserId, insertWallet } from "../infrastructure/persistence/wallet.repository.ts";
import { insertSavingsAccount } from "../infrastructure/persistence/savings.repository.ts";
import { insertAuditEvent } from "../infrastructure/persistence/audit.repository.ts";
import { isNonNegativeVnd } from "../domain/money.ts";
import { invalidInput, walletAlreadyInitialized } from "../domain/errors.ts";
import { toWallet, type WalletView } from "./map.ts";

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
    userId: input.userId,
    scope: "wallet.baseline",
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    mutate: async (conn, _idempotencyId) => {
      const existing = await findWalletByUserId(conn, input.userId);
      if (existing !== null) throw walletAlreadyInitialized();
      await insertWallet(conn, input.userId, input.initialBalanceVnd);
      await insertSavingsAccount(conn, input.userId);
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