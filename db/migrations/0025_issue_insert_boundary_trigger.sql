CREATE TRIGGER trg_issue_insert_owner_boundary
  BEFORE INSERT ON issues
  FOR EACH ROW
  SET NEW.user_id = (
    SELECT CASE WHEN i.user_id = NEW.user_id AND i.scope = 'issue.create' THEN NEW.user_id ELSE NULL END
    FROM mutation_idempotency AS i
    WHERE i.id = NEW.idempotency_id
  );
