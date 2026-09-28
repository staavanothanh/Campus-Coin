-- Planned cashflow is user-entered guidance only; it is not a wallet or ledger row.
CREATE TABLE cashflow_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  kind ENUM('obligation', 'expected_income') NOT NULL,
  title VARCHAR(120) NOT NULL,
  amount_vnd BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  frequency ENUM('once', 'monthly') NOT NULL,
  starts_on DATE NOT NULL,
  due_day TINYINT UNSIGNED NULL,
  reserve_in_forecast TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  disabled_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_cashflow_plans_owner_active (user_id, is_active, starts_on),
  KEY idx_cashflow_plans_owner_kind (user_id, kind, starts_on),
  CONSTRAINT fk_cashflow_plans_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_cashflow_plans_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
  CONSTRAINT chk_cashflow_plans_title CHECK (title <> '' AND title = TRIM(title)),
  CONSTRAINT chk_cashflow_plans_amount CHECK (amount_vnd > 0 AND amount_vnd <= 9007199254740991),
  CONSTRAINT chk_cashflow_plans_schedule CHECK (
    (frequency = 'once' AND due_day IS NULL)
    OR (frequency = 'monthly' AND due_day IS NOT NULL AND due_day BETWEEN 1 AND 31)
  ),
  CONSTRAINT chk_cashflow_plans_income_shape CHECK (
    kind <> 'expected_income' OR (category_id IS NULL AND reserve_in_forecast = 0)
  ),
  CONSTRAINT chk_cashflow_plans_active_shape CHECK (
    (is_active = 1 AND disabled_at IS NULL)
    OR (is_active = 0 AND disabled_at IS NOT NULL)
  )
) ENGINE = InnoDB;
