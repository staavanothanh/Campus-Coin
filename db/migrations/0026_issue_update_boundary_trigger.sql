CREATE TRIGGER trg_issue_update_owner_boundary
  BEFORE UPDATE ON issues
  FOR EACH ROW
  SET NEW.user_id = IF(NEW.user_id = OLD.user_id, NEW.user_id, NULL);
