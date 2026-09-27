-- Đề xuất Dev A: email/mật khẩu + OTP. Không sửa các migration tiền của Dev B.
CREATE TABLE IF NOT EXISTS auth_credentials (
  user_id BIGINT UNSIGNED NOT NULL,
  password_hash CHAR(128) NOT NULL,
  password_salt CHAR(32) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  CONSTRAINT fk_auth_credentials_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS email_otps (
  id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  purpose ENUM('registration', 'password_reset') NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_email_otps_email_purpose_created (email, purpose, created_at),
  CONSTRAINT chk_email_otps_attempts CHECK (attempts <= max_attempts)
) ENGINE = InnoDB;
