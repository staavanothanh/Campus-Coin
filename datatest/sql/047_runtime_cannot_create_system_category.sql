-- expect-error
-- Runtime inserts must not create global/default categories directly.
INSERT INTO categories (user_id, name_en, name_vi, applies_to, status, is_default)
VALUES (NULL, 'Injected system category', 'Danh mục giả', 'payment', 'active', 1);
