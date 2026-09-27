// Savings service: aggregate riêng, transfer atomic, lock order wallet → savings (ADR-0005).

import type { Db } from "../infrastructure/db/pool.ts";
import { withIdempotentMutation } from "./idempotency.ts";
import { lockWalletForUpdate } from "../infrastructure/persistence/wallet.repository.ts";
import {
  findSavingsByUserId,
  findTransferById,
  insertSavingsTransfer,
  listSavingsTransfersPage,
  lockSavingsForUpdate,
  type SavingsTransferRow,
} from "../infrastructure/persistence/savings.repository.ts";
import { insertAuditEvent } from "../infrastructure/persistence/audit.repository.ts";
import { decodeCursor, encodeCursor, isPageLimit } from "../domain/period.ts";
import {
  addSafeIntegers,
  isPositiveVnd,
  isTransferDirection,
  subtractSafeIntegers,
  type TransferDirection,
} from "../domain/money.ts";
import { readCursorSigningKey } from "../infrastructure/db/env.ts";
import {
  insufficientSavingsBalance,
  insufficientWalletBalance,
  invalidInput,
  walletNotInitialized,
} from "../domain/errors.ts";
import { toSavings, type SavingsView } from "./map.ts";

export async function getSavings(db: Db, userId: number): Promise<SavingsView | null> {
  const row = await findSavingsByUserId(db, userId);
  return row === null ? null : toSavings(row);
}

export interface SavingsTransferView {
  id: string;
  direction: TransferDirection;
  amountVnd: number;
  note: string | null;
  createdAt: string;
}

function toTransferView(row: SavingsTransferRow): SavingsTransferView {
  return {
    id: String(row.id),
    direction: row.direction,
    amountVnd: row.amountVnd,
    note: row.note,
    createdAt: row.createdAt,
  };
}

export interface CreateTransferInput {
  userId: number;
  direction: TransferDirection;
  amountVnd: number;
  note: string | null;
  idempotencyKey: string;
  requestHash: string;
}

export async function createTransfer(db: Db, input: CreateTransferInput): Promise<SavingsTransferView> {
  if (!isTransferDirection(input.direction)) throw invalidInput("direction must be deposit|withdraw");
  if (!isPositiveVnd(input.amountVnd)) throw invalidInput("amountVnd must be a positive integer VND");
  if (input.note !== null && input.note.length > 500) throw invalidInput("note too long (max 500)");
  return withIdempotentMutation({
    db,
    userId: input.userId,
    scope: "savings.transfer",
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    mutate: async (conn, idempotencyId) => {
      const wallet = await lockWalletForUpdate(conn, input.userId);
      if (wallet === null) throw walletNotInitialized();
      const savings = await lockSavingsForUpdate(conn, input.userId);
      if (savings === null) throw walletNotInitialized();

      let walletBalance = wallet.availableBalanceVnd;
      let savingsBalance = savings.balanceVnd;
      if (input.direction === "deposit") {
        if (walletBalance < input.amountVnd) throw insufficientWalletBalance();
        walletBalance = subtractSafeIntegers(walletBalance, input.amountVnd);
        savingsBalance = addSafeIntegers(savingsBalance, input.amountVnd);
      } else {
        if (savingsBalance < input.amountVnd) throw insufficientSavingsBalance();
        walletBalance = addSafeIntegers(walletBalance, input.amountVnd);
        savingsBalance = subtractSafeIntegers(savingsBalance, input.amountVnd);
      }
      const transferId = await insertSavingsTransfer(conn, {
        userId: input.userId,
        direction: input.direction,
        amountVnd: input.amountVnd,
        note: input.note,
        idempotencyId,
      });
      const projectedWallet = await lockWalletForUpdate(conn, input.userId);
      const projectedSavings = await lockSavingsForUpdate(conn, input.userId);
      if (projectedWallet?.availableBalanceVnd !== walletBalance || projectedSavings?.balanceVnd !== savingsBalance) {
        throw new Error("savings projection trigger did not apply the transfer delta");
      }
      await insertAuditEvent(conn, {
        userId: input.userId,
        actorType: "user",
        actorUserId: input.userId,
        action: "savings.transfer",
        scope: "savings",
        targetId: transferId,
        outcome: "success",
      });
      const row = await findTransferById(conn, input.userId, transferId);
      if (row === null) throw new Error("transfer row missing after insert");
      return toTransferView(row);
    },
  });
}

export async function listTransfers(
  db: Db,
  userId: number,
  cursor: string | undefined,
  limit: number,
): Promise<{ data: SavingsTransferView[]; meta: { cursor: string | null; hasNext: boolean } }> {
  if (!isPageLimit(limit)) throw invalidInput("limit must be an integer from 1 to 100");
  let cursorId: number | null = null;
  if (cursor !== undefined) {
    const signingKey = readCursorSigningKey();
    try {
      cursorId = decodeCursor(cursor, signingKey);
    } catch {
      throw invalidInput("invalid cursor");
    }
  }
  const page = await listSavingsTransfersPage(db, userId, cursorId, limit);
  const last = page.rows[page.rows.length - 1];
  return {
    data: page.rows.map(toTransferView),
    meta: {
      cursor: page.hasNext && last !== undefined ? encodeCursor(last.id, readCursorSigningKey()) : null,
      hasNext: page.hasNext,
    },
  };
}
