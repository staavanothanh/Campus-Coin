import { assertAuthSecrets } from './features/auth/config.js';
import { createApiServer } from './routes/api.js';
import { assertSchemaReady } from './infrastructure/db/readiness.js';
import { assertSmtpConfigured } from './infrastructure/mail.js';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

async function main() {
  assertAuthSecrets();
  if (!process.env.CLIENT_ORIGIN) {
    throw new Error('Thiếu hoặc sai định dạng biến cấu hình auth bắt buộc');
  }
  assertSmtpConfigured();
  await assertSchemaReady();
  const port = Number(process.env.PORT || 3000);
  createApiServer().listen(port, () => console.log(`Campus Coin API đang chạy ở cổng ${port}`));
}

main().catch(() => {
  console.error('Không thể khởi động API. Kiểm tra cấu hình và kết nối MySQL.');
  process.exitCode = 1;
});
