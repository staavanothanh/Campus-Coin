// Category: system (user_id NULL) + custom (user_id = owner).
// Không hard-delete category đã tham chiếu; disable/retire giữ history (ADR-0005).

import type { TransactionType, CategoryStatus } from "../../domain/money.js";
import { amountFromDb } from "./rows.js";

export interface CategoryRow {
  id: number;
  nameEn: string;
  nameVi: string;
  appliesTo: TransactionType;
  status: CategoryStatus;
  isDefault: boolean;
}

export interface CategoryScalar {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

interface CategoryDbRow {
  id: number | string;
  name_en: string;
  name_vi: string;
  applies_to: TransactionType;
  status: CategoryStatus;
  is_default: number;
}

function mapCategoryRow(row: CategoryDbRow): CategoryRow {
  return {
    id: amountFromDb(row.id),
    nameEn: row.name_en,
    nameVi: row.name_vi,
    appliesTo: row.applies_to,
    status: row.status,
    isDefault: row.is_default === 1,
  };
}

const CATEGORY_COLUMNS = "id, name_en, name_vi, applies_to, status, is_default";

/** List system + custom theo owner; filter tùy chọn applies_to/includeDisabled. */
export async function listCategories(
  db: CategoryScalar,
  userId: number,
  options: { appliesTo?: TransactionType; includeDisabled?: boolean } = {},
): Promise<CategoryRow[]> {
  const conditions = ["(user_id IS NULL OR user_id = ?)"];
  const params: unknown[] = [userId];
  if (options.appliesTo !== undefined) {
    conditions.push("applies_to = ?");
    params.push(options.appliesTo);
  }
  if (options.includeDisabled !== true) {
    conditions.push("status = 'active'");
  }
  const [rows] = (await db.query(
    `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE ${conditions.join(" AND ")} ORDER BY is_default DESC, id ASC`,
    params,
  )) as [CategoryDbRow[], unknown];
  return rows.map(mapCategoryRow);
}

/** Tìm category trong owner scope của user (system hoặc của chính user). */
export async function findCategoryById(
  db: CategoryScalar,
  userId: number,
  categoryId: number,
  lock = false,
): Promise<CategoryRow | null> {
  const [rows] = (await db.query(
    `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)${lock ? " FOR UPDATE" : ""}`,
    [categoryId, userId],
  )) as [CategoryDbRow[], unknown];
  const row = rows[0];
  return row === undefined ? null : mapCategoryRow(row);
}

export async function insertCustomCategory(
  db: CategoryScalar,
  userId: number,
  input: { nameEn: string; nameVi: string; appliesTo: TransactionType },
  idempotencyId: number,
): Promise<number> {
  const [result] = (await db.query(
    "INSERT INTO categories (user_id, name_en, name_vi, applies_to, status, is_default, idempotency_id) VALUES (?, ?, ?, ?, 'active', 0, ?)",
    [userId, input.nameEn, input.nameVi, input.appliesTo, idempotencyId],
  )) as [{ insertId: number | string }, unknown];
  return Number(result.insertId);
}

export interface CategoryPatch {
  nameEn?: string;
  nameVi?: string;
  status?: CategoryStatus;
}

/** Chỉ sửa được custom category của chính user; trả false nếu không thuộc owner/không tồn tại. */
export async function updateCustomCategory(
  db: CategoryScalar,
  userId: number,
  categoryId: number,
  patch: CategoryPatch,
): Promise<boolean> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.nameEn !== undefined) {
    sets.push("name_en = ?");
    params.push(patch.nameEn);
  }
  if (patch.nameVi !== undefined) {
    sets.push("name_vi = ?");
    params.push(patch.nameVi);
  }
  if (patch.status !== undefined) {
    sets.push("status = ?");
    params.push(patch.status);
  }
  if (sets.length === 0) return true;
  const [result] = (await db.query(
    `UPDATE categories SET ${sets.join(", ")} WHERE id = ? AND user_id = ? AND is_default = 0`,
    [...params, categoryId, userId],
  )) as [{ affectedRows: number }, unknown];
  return result.affectedRows === 1;
}
