-- expect-error: append-only
-- audit_events append-only, không DELETE.
DELETE FROM audit_events WHERE id = 1;