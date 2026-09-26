-- expect-error: chk_budgets_limit_safe
UPDATE budgets SET limit_vnd = 9007199254740992 WHERE id = 1;
