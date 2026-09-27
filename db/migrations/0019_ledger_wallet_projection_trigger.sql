CREATE TRIGGER trg_ledger_apply_wallet_delta
  AFTER INSERT ON ledger_transactions
  FOR EACH ROW
  UPDATE wallet_accounts
  SET available_balance_vnd = available_balance_vnd + NEW.wallet_delta_vnd
  WHERE user_id = NEW.user_id;
