-- Rate-limit buckets dùng HMAC để không lưu raw email hoặc địa chỉ IP.
-- Chỉ ghi state tạm cho xác thực; không chứa password, OTP hoặc session token.
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket_hash BINARY(32) NOT NULL,
  attempt_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  window_started_at DATETIME(3) NOT NULL,
  blocked_until DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (bucket_hash),
  KEY idx_auth_rate_limits_updated (updated_at),
  CONSTRAINT chk_auth_rate_limits_attempts CHECK (attempt_count <= 1000)
) ENGINE = InnoDB;
