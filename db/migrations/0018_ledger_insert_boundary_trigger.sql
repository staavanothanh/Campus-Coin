-- Owner, category, idempotency scope, and authoritative signed wallet delta.
CREATE TRIGGER trg_ledger_insert_owner_boundary
  BEFORE INSERT ON ledger_transactions
  FOR EACH ROW
  SET
    NEW.user_id = (
      SELECT CASE
        WHEN (c.user_id IS NULL OR c.user_id = NEW.user_id)
          AND c.applies_to = NEW.type
          AND c.status = 'active'
          AND i.user_id = NEW.user_id
          AND i.scope = CASE WHEN NEW.role = 'original' THEN 'ledger.create' ELSE 'ledger.correction' END
        THEN NEW.user_id
        ELSE NULL
      END
      FROM categories AS c
      JOIN mutation_idempotency AS i ON i.id = NEW.idempotency_id
      WHERE c.id = NEW.category_id
    ),
    NEW.wallet_delta_vnd = CASE
      WHEN NEW.role = 'original' THEN
        CASE WHEN NEW.type = 'income' THEN CAST(NEW.amount_vnd AS SIGNED) ELSE -CAST(NEW.amount_vnd AS SIGNED) END
      WHEN NEW.role = 'reversal' THEN (
        SELECT CASE WHEN target.type = 'income' THEN -CAST(target.amount_vnd AS SIGNED) ELSE CAST(target.amount_vnd AS SIGNED) END
        FROM ledger_transactions AS target
        WHERE target.id = NEW.reference_id AND target.user_id = NEW.user_id AND target.role = 'original'
      )
      ELSE (
        SELECT CASE
          WHEN target.type = 'income' THEN CAST(NEW.amount_vnd AS SIGNED) - CAST(target.amount_vnd AS SIGNED)
          ELSE CAST(target.amount_vnd AS SIGNED) - CAST(NEW.amount_vnd AS SIGNED)
        END
        FROM ledger_transactions AS target
        WHERE target.id = NEW.reference_id AND target.user_id = NEW.user_id AND target.role = 'original'
      )
    END;
