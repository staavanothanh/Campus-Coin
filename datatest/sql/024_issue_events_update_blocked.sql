-- expect-error: append-only
-- issue_events append-only, không UPDATE.
UPDATE issue_events SET note = 'xóa lịch sử' WHERE id = 1;