-- expect-error
-- Issue của user 2 không thể tham chiếu ledger transaction của user 1.
INSERT INTO issues (user_id, related_transaction_id, title, description, category, idempotency_id)
VALUES (2, 1, 'Cross-owner issue probe', 'Should be rejected', 'financial_dispute', 23);
