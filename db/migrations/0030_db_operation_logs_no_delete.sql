CREATE TRIGGER trg_db_operation_logs_no_delete
  BEFORE DELETE ON db_operation_logs
  FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'db_operation_logs is append-only (delete blocked)';
