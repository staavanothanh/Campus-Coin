-- expect-error: append-only
-- savings_transfers append-only, không DELETE.
DELETE FROM savings_transfers WHERE id = 1;