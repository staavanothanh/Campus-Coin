CREATE TABLE db_operation_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  operation_id CHAR(36) NOT NULL,
  project_key VARCHAR(64) NOT NULL,
  environment_key ENUM('local', 'development', 'preview', 'staging', 'production') NOT NULL,
  operation ENUM('migration', 'reconcile', 'restore') NOT NULL,
  outcome ENUM('success', 'failure') NOT NULL,
  migration_version CHAR(4) NULL,
  external_reference VARCHAR(128) NULL,
  duration_ms BIGINT UNSIGNED NULL,
  error_code VARCHAR(64) NULL,
  recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_db_operation_logs_operation_id (operation_id),
  KEY idx_db_operation_logs_project_time (project_key, environment_key, recorded_at, id),
  CONSTRAINT chk_db_operation_logs_project_key CHECK (project_key <> ''),
  CONSTRAINT chk_db_operation_logs_migration_version CHECK (
    (operation = 'migration' AND migration_version IS NOT NULL)
    OR (operation <> 'migration' AND migration_version IS NULL)
  ),
  CONSTRAINT chk_db_operation_logs_error_code CHECK (
    (outcome = 'failure' AND error_code IS NOT NULL)
    OR (outcome = 'success' AND error_code IS NULL)
  )
) ENGINE = InnoDB;
