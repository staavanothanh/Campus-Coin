USE campus_coin;

SET @test_user_id = 999001;
SET @test_user_id2 = 999002;

DELETE FROM budgets WHERE user_id IN (@test_user_id, @test_user_id2);
DELETE FROM savings_accounts WHERE user_id IN (@test_user_id, @test_user_id2);
DELETE FROM wallet_accounts WHERE user_id IN (@test_user_id, @test_user_id2);

SELECT 'cleanup complete' AS status;
