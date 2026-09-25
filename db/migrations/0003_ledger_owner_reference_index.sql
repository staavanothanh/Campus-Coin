-- 0003_ledger_owner_reference_index.sql — index owner-scoped cho antijoin correction.
-- Report/budget dò "row chưa bị correction thay thế" theo (user_id, reference_id).
-- Không có index này, MySQL dò index (reference_id) rồi lọc user ở tầng filter,
-- và optimizer chọn materialize DISTINCT reference_id toàn bảng (mọi tenant).
-- Index tồn tại cho FK ledger_transactions.reference_id là single-column
-- (fk_ledger_reference) — không dùng được cho predicate owner-scoped.
-- Non-destructive: chỉ thêm index; engine forward-only, không có down.

ALTER TABLE ledger_transactions
  ADD INDEX idx_ledger_user_reference (user_id, reference_id);
