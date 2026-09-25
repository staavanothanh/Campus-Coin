CREATE TRIGGER trg_budget_update_owner_boundary
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  SET NEW.user_id = (
    SELECT CASE
      WHEN NEW.user_id = OLD.user_id
        AND (c.user_id IS NULL OR c.user_id = NEW.user_id)
        AND c.applies_to = 'payment' AND c.status = 'active'
        AND i.user_id = NEW.user_id AND i.scope = 'budget.upsert'
      THEN NEW.user_id
      ELSE NULL
    END
    FROM categories AS c
    JOIN mutation_idempotency AS i ON i.id = NEW.idempotency_id
    WHERE c.id = NEW.category_id
  );
