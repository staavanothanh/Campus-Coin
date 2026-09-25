-- 0011_ledger_owner_projection_keys.sql — composite owner keys cho ledger projection.
-- LƯU Ý REPAIR (2026-09-25, Team Leader duyệt trong yêu cầu xử lý CI MySQL):
-- file gốc gộp UNIQUE KEYs và self-referencing FK trong cùng một ALTER TABLE nên
-- InnoDB không tìm thấy parent index (lỗi 1828 tại fk_ledger_reference_owner_role)
-- trên mọi fresh install (CI run 36087720681, MySQL 8.0.41 local). Chưa có shared DB
-- nào apply thành công 0011 (Aiven applied=3), nên repair chỉ tách thứ tự DDL,
-- giữ nguyên tên constraint/index và semantics; không đổi dữ liệu tài chính.
-- MySQL không nhận parent index tạo trong cùng ALTER cho self-FK, vì vậy:
-- (1) columns + UNIQUE KEYs trước, (2) FKs sau, (3) DROP FKs cũ cuối cùng.
ALTER TABLE ledger_transactions
  ADD CONSTRAINT chk_ledger_amount_safe_integer CHECK (amount_vnd <= 9007199254740991),
  ADD COLUMN reference_target_role ENUM('original', 'reversal', 'adjustment', 'replacement')
    NOT NULL DEFAULT 'original',
  ADD COLUMN wallet_delta_vnd BIGINT NULL,
  ADD UNIQUE KEY uq_ledger_id_user (id, user_id),
  ADD UNIQUE KEY uq_ledger_id_user_role (id, user_id, role),
  ADD UNIQUE KEY uq_ledger_id_user_role_type (id, user_id, role, type),
  ADD UNIQUE KEY uq_ledger_user_reference (user_id, reference_id),
  ADD UNIQUE KEY uq_ledger_idempotency (idempotency_id),
  ADD CONSTRAINT chk_ledger_reference_target_role CHECK (reference_target_role = 'original');

ALTER TABLE ledger_transactions
  ADD CONSTRAINT fk_ledger_reference_owner_role
    FOREIGN KEY (reference_id, user_id, reference_target_role, type)
    REFERENCES ledger_transactions (id, user_id, role, type) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_ledger_idempotency_owner
    FOREIGN KEY (idempotency_id, user_id)
    REFERENCES mutation_idempotency (id, user_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_ledger_wallet_owner
    FOREIGN KEY (user_id) REFERENCES wallet_accounts (user_id) ON DELETE RESTRICT;

ALTER TABLE ledger_transactions
  DROP FOREIGN KEY fk_ledger_reference,
  DROP FOREIGN KEY fk_ledger_idempotency;
