-- Campus Coin — grants template (least privilege, look-then-run bởi DBA/provider console)
-- Không chứa giá trị thật; thay ${...} bằng giá trị secret của environment.
-- Chạy script này một lần với tài khoản quản trị provider (không phải runtime role).
-- Migration runner dùng role migration (DDL + quyền DML trên schema_migrations).
-- Runtime API dùng role runtime: chỉ DML, không DDL/TRIGGER/TRUNCATE/PROCESS/SUPER/FILE.

-- 1) Tạo database nếu provider yêu cầu (charset bắt buộc utf8mb4).
-- CREATE DATABASE campus_coin CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 2) Role migration: tạo schema và chạy DDL migration, kể cả bảng schema_migrations.
CREATE USER IF NOT EXISTS 'cc_migrate'@'%' IDENTIFIED BY '${CAMPUS_COIN_DB_MIGRATE_PASSWORD}';
GRANT CREATE, ALTER, DROP, INDEX, REFERENCES, TRIGGER
  ON campus_coin.* TO 'cc_migrate'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE
  ON campus_coin.* TO 'cc_migrate'@'%';
FLUSH PRIVILEGES;

-- 3) Role runtime: chỉ DML trên dữ liệu; không thể sửa schema, trigger hoặc truncate.
CREATE USER IF NOT EXISTS 'cc_runtime'@'%' IDENTIFIED BY '${CAMPUS_COIN_DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE
  ON campus_coin.* TO 'cc_runtime'@'%';
FLUSH PRIVILEGES;

-- Lưu ý bảo mật:
-- - Không cấp PROCESS, SUPER, FILE, GRANT OPTION, CREATE/ALTER/DROP/TRIGGER/REFERENCES cho runtime role.
-- - Runtime role không cần TRUNCATE; xóa dữ liệu chỉ qua DELETE có owner scope trong code.
-- - Nếu provider dùng IP allowlist, thay '%' bằng CIDR của Vercel.
-- - Giá trị password chỉ nằm ở provider console / Vercel environment; không commit.