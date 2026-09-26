-- expect-error: chk_datatest_assertion_passed
INSERT INTO _datatest_assertions (assertion_name, passed)
VALUES ('false assertion must fail', 0);
