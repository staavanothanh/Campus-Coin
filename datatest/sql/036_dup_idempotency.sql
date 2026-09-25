-- expect-error: uq_idempotency_user_scope_key
-- Cùng (user, scope, idempotency_key) không được INSERT lần hai (conflict 409 ở API).
INSERT INTO mutation_idempotency (user_id, scope, idempotency_key, request_hash, response_json)
VALUES (1, 'wallet.baseline', 'key-fixture', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', CAST('{"ok":false}' AS JSON));