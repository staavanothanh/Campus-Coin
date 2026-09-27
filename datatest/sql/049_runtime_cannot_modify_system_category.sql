-- expect-error
-- Runtime SQL cannot change a shared system category.
UPDATE categories SET status = 'disabled' WHERE id = 1;
