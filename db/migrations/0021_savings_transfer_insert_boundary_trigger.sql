CREATE TRIGGER trg_savings_transfer_insert_owner_boundary
  BEFORE INSERT ON savings_transfers
  FOR EACH ROW
  SET NEW.user_id = (
    SELECT CASE
      WHEN i.user_id = NEW.user_id AND i.scope = 'savings.transfer' THEN NEW.user_id
      ELSE NULL
    END
    FROM mutation_idempotency AS i
    WHERE i.id = NEW.idempotency_id
  );
