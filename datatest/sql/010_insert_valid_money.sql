-- 010_insert_valid_money.sql — dữ liệu hợp lệ phải INSERT được (CHECK không chặn nhầm).

-- amount = 1 (dương) hợp lệ.
INSERT INTO ledger_transactions (id, user_id, type, amount_vnd, category_id, occurred_at, role)
VALUES (2, 1, 'payment', 1, 5, '2026-09-02 00:00:00.000', 'original');

-- Correction hợp lệ: role <> original có reference + reason + amount dương.
INSERT INTO ledger_transactions (id, user_id, type, amount_vnd, category_id, occurred_at, role, reference_id, reason)
VALUES (3, 1, 'payment', 1, 5, '2026-09-01 00:00:00.000', 'reversal', 2, 'hoàn tiền mẫu');

-- Budget upsert (INSERT … ON DUPLICATE KEY UPDATE) chạy được.
INSERT INTO budgets (user_id, category_id, month, limit_vnd)
VALUES (1, 5, '2026-09', 250000) AS new
ON DUPLICATE KEY UPDATE limit_vnd = new.limit_vnd;

SET @n = (SELECT COUNT(*) FROM budgets WHERE user_id = 1 AND category_id = 5 AND month = '2026-09');
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('budget row', @n = 1);

-- Audit append: thêm row mới OK (không sửa row cũ).
INSERT INTO audit_events (user_id, actor_type, actor_user_id, action, scope, outcome)
VALUES (1, 'user', 1, 'ledger.create', 'ledger', 'success');

SET @n = (SELECT COUNT(*) FROM audit_events WHERE id = 1 AND action = 'wallet.initialize');
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('old audit row unchanged', @n = 1);

-- Volume tiền không âm sau khi insert mẫu.
SET @n = (SELECT COUNT(*) FROM ledger_transactions WHERE amount_vnd <= 0);
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('no invalid ledger amount', @n = 0);

-- Idempotency replay: INSERT cùng key phải để nguyên response cũ? Không — key là UNIQUE,
-- file negative 036 kiểm tra chặn. Ở đây chỉ xác nhận row fixture còn nguyên.
SET @n = (SELECT COUNT(*) FROM mutation_idempotency WHERE id = 1 AND response_json->>'$.ok' = 'true');
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('idempotency fixture row', @n = 1);
