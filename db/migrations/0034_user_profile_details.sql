-- Optional personal details requested by the account owner.
-- Existing accounts keep NULL until the user chooses to provide these values.
ALTER TABLE users
  ADD COLUMN birth_date DATE NULL AFTER locale,
  ADD COLUMN gender VARCHAR(32) NULL AFTER birth_date,
  ADD CONSTRAINT chk_users_gender_value
    CHECK (gender IS NULL OR gender IN ('female', 'male', 'non_binary', 'prefer_not_to_say'));
