const REQUIRED_AUTH_SECRETS = ['OTP_SECRET', 'SESSION_SECRET', 'AUTH_RATE_LIMIT_SECRET'] as const;

export function assertAuthSecrets(env: NodeJS.ProcessEnv = process.env): void {
  const hasInvalidSecret = REQUIRED_AUTH_SECRETS.some(name => {
    const value = env[name];
    return !value || Buffer.byteLength(value, 'utf8') < 32;
  });
  if (hasInvalidSecret) throw new Error('Thiếu hoặc sai định dạng biến cấu hình auth bắt buộc');
}
