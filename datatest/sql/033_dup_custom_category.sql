-- expect-error: uq_categories_owner_name
-- Custom category trùng (owner, applies_to, name_en) bị UNIQUE chặn (conflict 409 ở API).
INSERT INTO categories (user_id, name_en, name_vi, applies_to, status, is_default, idempotency_id)
VALUES (1, 'Snacks', 'Ăn vặt', 'payment', 'active', 0, 19);
