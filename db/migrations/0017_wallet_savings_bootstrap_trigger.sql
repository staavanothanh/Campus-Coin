CREATE TRIGGER trg_wallet_insert_savings_account
  AFTER INSERT ON wallet_accounts
  FOR EACH ROW
  INSERT INTO savings_accounts (user_id, balance_vnd, currency) VALUES (NEW.user_id, 0, 'VND');
