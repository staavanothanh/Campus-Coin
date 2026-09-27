CREATE TRIGGER trg_savings_transfer_apply_projections
  AFTER INSERT ON savings_transfers
  FOR EACH ROW
  UPDATE wallet_accounts AS w
  INNER JOIN savings_accounts AS s ON s.user_id = w.user_id
  SET
    w.available_balance_vnd = w.available_balance_vnd +
      CASE WHEN NEW.direction = 'deposit' THEN -CAST(NEW.amount_vnd AS SIGNED) ELSE CAST(NEW.amount_vnd AS SIGNED) END,
    s.balance_vnd = s.balance_vnd +
      CASE WHEN NEW.direction = 'deposit' THEN CAST(NEW.amount_vnd AS SIGNED) ELSE -CAST(NEW.amount_vnd AS SIGNED) END
  WHERE w.user_id = NEW.user_id;
