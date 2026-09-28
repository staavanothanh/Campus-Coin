-- Expand/contract the profile gender constraint without editing applied migration 0034.
ALTER TABLE users
  DROP CONSTRAINT chk_users_gender_value,
  ADD CONSTRAINT chk_users_gender_value_new
    CHECK (gender IS NULL OR gender IN ('female', 'male', 'non_binary', 'gender_neutral', 'prefer_not_to_say'));

UPDATE users SET gender = 'gender_neutral' WHERE gender = 'non_binary';

ALTER TABLE users DROP CONSTRAINT chk_users_gender_value_new;
ALTER TABLE users
  ADD CONSTRAINT chk_users_gender_value
    CHECK (gender IS NULL OR gender IN ('female', 'male', 'gender_neutral', 'prefer_not_to_say'));
