// Category service: system + custom; disable/retire giữ history, không hard-delete.

import type { Db } from "../infrastructure/db/pool.ts";
import { withConnection } from "../infrastructure/db/pool.ts";
import { withIdempotentMutation } from "./idempotency.ts";
import {
  findCategoryById,
  insertCustomCategory,
  listCategories,
  updateCustomCategory,
} from "../infrastructure/persistence/category.repository.ts";
import { insertAuditEvent } from "../infrastructure/persistence/audit.repository.ts";
import { isCategoryStatus, isTransactionType, type CategoryStatus, type TransactionType } from "../domain/money.ts";
import { invalidInput, notFound } from "../domain/errors.ts";
import { toCategory, type CategoryView } from "./map.ts";

export interface ListCategoriesOptions {
  appliesTo?: TransactionType;
  includeDisabled?: boolean;
}

export async function listUserCategories(db: Db, userId: number, options: ListCategoriesOptions = {}): Promise<CategoryView[]> {
  if (options.appliesTo !== undefined && !isTransactionType(options.appliesTo)) {
    throw invalidInput("invalid appliesTo filter");
  }
  const repoOptions: { appliesTo?: "income" | "payment"; includeDisabled?: boolean } = {};
  if (options.appliesTo !== undefined) repoOptions.appliesTo = options.appliesTo;
  if (options.includeDisabled === true) repoOptions.includeDisabled = true;
  const rows = await listCategories(db, userId, repoOptions);
  return rows.map(toCategory);
}

export interface CreateCategoryInput {
  userId: number;
  nameEn: string;
  nameVi: string;
  appliesTo: TransactionType;
  idempotencyKey: string;
  requestHash: string;
}

/** Trả null khi trùng tên (409 Conflict ở API layer). */
export async function createCustomCategory(_db: Db, input: CreateCategoryInput): Promise<CategoryView | null> {
  if (!isTransactionType(input.appliesTo)) throw invalidInput("appliesTo must be income|payment");
  if (input.nameEn.length === 0 || input.nameEn.length > 80) throw invalidInput("nameEn required (max 80)");
  if (input.nameVi.length > 80) throw invalidInput("nameVi too long (max 80)");
  return withIdempotentMutation({
    userId: input.userId,
    scope: "category.create",
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    mutate: async (conn) => {
      try {
      const id = await insertCustomCategory(conn, input.userId, {
        nameEn: input.nameEn,
        nameVi: input.nameVi,
        appliesTo: input.appliesTo,
      });
      await insertAuditEvent(conn, {
        userId: input.userId,
        actorType: "user",
        actorUserId: input.userId,
        action: "category.create",
        scope: "category",
        targetId: id,
        outcome: "success",
      });
      const row = await findCategoryById(conn, input.userId, id);
      if (row === null) throw new Error("category row missing after insert");
        return toCategory(row);
      } catch (error) {
        if (isDuplicateEntry(error)) return null;
        throw error;
      }
    },
  });
}

export interface UpdateCategoryInput {
  userId: number;
  categoryId: number;
  nameEn?: string;
  nameVi?: string;
  status?: CategoryStatus;
}

export async function updateUserCategory(db: Db, input: UpdateCategoryInput): Promise<CategoryView> {
  if (input.nameEn !== undefined && (input.nameEn.length === 0 || input.nameEn.length > 80)) {
    throw invalidInput("nameEn required (max 80)");
  }
  if (input.nameVi !== undefined && input.nameVi.length > 80) throw invalidInput("nameVi too long (max 80)");
  if (input.status !== undefined && !isCategoryStatus(input.status)) {
    throw invalidInput("invalid status");
  }
  return withConnection(async (conn) => {
    const patch: { nameEn?: string; nameVi?: string; status?: "active" | "disabled" | "retired" } = {};
    if (input.nameEn !== undefined) patch.nameEn = input.nameEn;
    if (input.nameVi !== undefined) patch.nameVi = input.nameVi;
    if (input.status !== undefined) patch.status = input.status;
    const updated = await updateCustomCategory(conn, input.userId, input.categoryId, patch);
    if (!updated) throw notFound();
    const row = await findCategoryById(conn, input.userId, input.categoryId);
    if (row === null) throw notFound();
    await insertAuditEvent(conn, {
      userId: input.userId,
      actorType: "user",
      actorUserId: input.userId,
      action: "category.update",
      scope: "category",
      targetId: input.categoryId,
      outcome: "success",
    });
    return toCategory(row);
  });
}

function isDuplicateEntry(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  return code === "ER_DUP_ENTRY";
}
