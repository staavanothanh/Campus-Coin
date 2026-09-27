CREATE TRIGGER trg_wallet_insert_baseline_boundary
  BEFORE INSERT ON wallet_accounts
  FOR EACH ROW
  SET NEW.user_id = (
    SELECT CASE WHEN i.user_id = NEW.user_id AND i.scope = 'wallet.baseline' THEN NEW.user_id ELSE NULL END
    FROM mutation_idempotency AS i
    WHERE i.id = NEW.idempotency_id
  ),
  NEW.available_balance_vnd = IF(
    NEW.initialized = 1 AND NEW.available_balance_vnd = NEW.initial_balance_vnd AND NEW.currency = 'VND',
    NEW.available_balance_vnd,
    NULL
  );
