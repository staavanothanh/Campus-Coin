import { createApiServer } from './routes/api.js';
import { getDb } from './infrastructure/db.js';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

async function main() {
  if (!process.env.OTP_SECRET || !process.env.SESSION_SECRET || !process.env.CLIENT_ORIGIN) {
    throw new Error('Thiếu OTP_SECRET, SESSION_SECRET hoặc CLIENT_ORIGIN');
  }
  await getDb().query('SELECT 1');
  const port = Number(process.env.PORT || 3000);
  createApiServer().listen(port, () => console.log(`Campus Coin API đang chạy ở cổng ${port}`));
}

main().catch(() => {
  console.error('Không thể khởi động API. Kiểm tra cấu hình và kết nối MySQL.');
  process.exitCode = 1;
});
