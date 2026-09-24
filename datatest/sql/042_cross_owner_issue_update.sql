-- expect-error
-- Issue không thể được chuyển sang owner khác bằng SQL trực tiếp.
UPDATE issues SET user_id = 2 WHERE id = 1;
