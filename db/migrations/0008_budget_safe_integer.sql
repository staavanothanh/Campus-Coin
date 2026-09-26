-- 0008_budget_safe_integer.sql

ALTER TABLE budgets
  ADD CONSTRAINT chk_budgets_limit_safe CHECK (limit_vnd <= 9007199254740991);
