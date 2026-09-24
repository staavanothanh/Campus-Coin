// Idempotency: retry cùng key+body trả kết quả đã lưu; cùng key khác body → conflict.
// API-REVIEW: kiểm tra idempotency trước domain existence check (network retry).

export interface IdempotencyRecord {
  id: number;
  requestHash: string;
  responseJson: unknown;
}

export interface IdempotencyScalar {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

export async function findIdempotency(
  db: IdempotencyScalar,
  userId: number,
  scope: string,
  idempotencyKey: string,
): Promise<IdempotencyRecord | null> {
  const [rows] = (await db.query(
    "SELECT id, request_hash, response_json FROM mutation_idempotency WHERE user_id = ? AND scope = ? AND idempotency_key = ?",
    [userId, scope, idempotencyKey],
  )) as [{ id: number | string; request_hash: string; response_json: unknown }[], unknown];
  const row = rows[0];
  if (row === undefined) return null;
  return { id: Number(row.id), requestHash: row.request_hash, responseJson: row.response_json };
}

/**
 * Claim idempotency row trước (placeholder) để mutation có thể liên kết idempotency_id
 * vào row cần thiết. response_json cập nhật sau
 * khi mutate xong — cả hai nằm trong cùng transaction nên không ai thấy placeholder.
 * ER_DUP_ENTRY → trả null để service xác định replay/conflict.
 */
export async function insertIdempotencyPlaceholder(
  conn: IdempotencyScalar,
  userId: number,
  scope: string,
  idempotencyKey: string,
  requestHash: string,
): Promise<number | null> {
  try {
    const [result] = (await conn.query(
      "INSERT INTO mutation_idempotency (user_id, scope, idempotency_key, request_hash, response_json) VALUES (?, ?, ?, ?, CAST('{}' AS JSON))",
      [userId, scope, idempotencyKey, requestHash],
    )) as [{ insertId: number | string }, unknown];
    return Number(result.insertId);
  } catch (error) {
    if (isDuplicateEntry(error)) return null;
    throw error;
  }
}

/** Ghi response thật sau khi mutation thành công (cùng transaction). */
export async function updateIdempotencyResponse(
  conn: IdempotencyScalar,
  id: number,
  responseJson: unknown,
): Promise<void> {
  const [result] = (await conn.query("UPDATE mutation_idempotency SET response_json = ? WHERE id = ?", [
    JSON.stringify(responseJson),
    id,
  ])) as [{ affectedRows: number }, unknown];
  if (result.affectedRows !== 1) {
    throw new Error(`idempotency row ${id} missing`);
  }
}

function isDuplicateEntry(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  return code === "ER_DUP_ENTRY";
}
