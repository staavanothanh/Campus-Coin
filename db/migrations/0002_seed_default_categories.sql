-- 0002_seed_default_categories.sql — system categories (is_default=1, user_id NULL).
-- Idempotent: INSERT IGNORE, không ghi đè category đã tồn tại (kể cả custom trùng tên).
-- Fixed id giữ ổn định giữa môi trường để fixture/test/suggestion tham chiếu được.
-- Copy là lane C/ops; danh sách này là seed tối thiểu để transaction có category ngay khi mở DB.

INSERT IGNORE INTO categories (id, user_id, name_en, name_vi, applies_to, status, is_default) VALUES
  (1, NULL, 'Salary',        'Lương',              'income',  'active', 1),
  (2, NULL, 'Allowance',     'Trợ cấp',            'income',  'active', 1),
  (3, NULL, 'Gift',          'Quà tặng',           'income',  'active', 1),
  (4, NULL, 'Other income',  'Khác',               'income',  'active', 1),
  (5, NULL, 'Food & Dining', 'Ăn uống',            'payment', 'active', 1),
  (6, NULL, 'Transport',     'Di chuyển',          'payment', 'active', 1),
  (7, NULL, 'Shopping',      'Mua sắm',            'payment', 'active', 1),
  (8, NULL, 'Entertainment', 'Giải trí',           'payment', 'active', 1),
  (9, NULL, 'Education',     'Học tập',            'payment', 'active', 1),
  (10, NULL, 'Rent & Utilities', 'Nhà ở & Điện nước', 'payment', 'active', 1),
  (11, NULL, 'Other payment', 'Khác',              'payment', 'active', 1);