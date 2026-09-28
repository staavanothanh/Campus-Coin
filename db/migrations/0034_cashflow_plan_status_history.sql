-- Preserve plan enable/disable history so closed-month reflections stay accurate.
ALTER TABLE cashflow_plans
  ADD UNIQUE KEY uq_cashflow_plans_owner_id (user_id, id);

CREATE TABLE cashflow_plan_status_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL,
  changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_cashflow_plan_status_owner_plan_time (user_id, plan_id, changed_at, id),
  CONSTRAINT fk_cashflow_plan_status_owner_plan
    FOREIGN KEY (user_id, plan_id) REFERENCES cashflow_plans (user_id, id) ON DELETE RESTRICT,
  CONSTRAINT chk_cashflow_plan_status_active CHECK (is_active IN (0, 1))
) ENGINE = InnoDB;

INSERT INTO cashflow_plan_status_events (id, user_id, plan_id, is_active, changed_at)
SELECT id, user_id, target_id,
  CASE WHEN action = 'cashflow.plan.disable' THEN 0 ELSE 1 END,
  created_at
FROM audit_events
WHERE scope = 'cashflow_plan'
  AND outcome = 'success'
  AND action IN ('cashflow.plan.create', 'cashflow.plan.disable', 'cashflow.plan.enable')
  AND user_id IS NOT NULL
  AND target_id IS NOT NULL
ORDER BY id;

INSERT INTO cashflow_plan_status_events (user_id, plan_id, is_active, changed_at)
SELECT plan.user_id, plan.id, 1, plan.created_at
FROM cashflow_plans AS plan
WHERE NOT EXISTS (
  SELECT 1
  FROM cashflow_plan_status_events AS status_event
  WHERE status_event.user_id = plan.user_id
    AND status_event.plan_id = plan.id
);

CREATE TRIGGER trg_cashflow_plan_status_events_no_update
  BEFORE UPDATE ON cashflow_plan_status_events
  FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'cashflow_plan_status_events is append-only (update blocked)';

CREATE TRIGGER trg_cashflow_plan_status_events_no_delete
  BEFORE DELETE ON cashflow_plan_status_events
  FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'cashflow_plan_status_events is append-only (delete blocked)';
