import { createApiServer } from './routes/api.js';
import { assertSmtpConfigured } from './infrastructure/mail.js';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

let startupStep = 'cấu hình xác thực';

function getSafeErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = error.code;
  return typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code) ? code : undefined;
}

async function main() {
  const requiredSecrets = ['OTP_SECRET', 'SESSION_SECRET', 'AUTH_RATE_LIMIT_SECRET'];
  const invalidSecrets = requiredSecrets.filter(name => {
    const value = process.env[name];
    return !value || Buffer.byteLength(value, 'utf8') < 32;
  });
  if (invalidSecrets.length > 0) throw new Error(`Thiếu hoặc sai định dạng: ${invalidSecrets.join(', ')}`);
  if (!process.env.CLIENT_ORIGIN) throw new Error('Thiếu CLIENT_ORIGIN');

  startupStep = 'cấu hình SMTP';
  assertSmtpConfigured();

  startupStep = 'khởi chạy API';
  const port = Number(process.env.PORT || 3000);
  const server = createApiServer();
  server.once('error', error => {
    const code = getSafeErrorCode(error);
    console.error(`API không mở được cổng ${port}${code ? ` (${code})` : ''}.`);
    process.exit(1);
  });
  server.listen(port, () => console.log(`Campus Coin API đang lắng nghe ở cổng ${port}; readiness DB/schema được kiểm tra theo request.`));
}

main().catch(error => {
  if (startupStep === 'cấu hình xác thực' || startupStep === 'cấu hình SMTP') {
    const message = error instanceof Error ? error.message : 'Cấu hình không hợp lệ';
    console.error(`API không khởi động được ở bước ${startupStep}: ${message}`);
  } else {
    const code = getSafeErrorCode(error);
    console.error(`API không khởi động được ở bước ${startupStep}${code ? ` (${code})` : ''}.`);
  }
  process.exitCode = 1;
});
