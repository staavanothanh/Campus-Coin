import { loadRuntimeEnvironment } from './runtime-env.ts';

loadRuntimeEnvironment();

import { DbEnvError } from './infrastructure/db/env.js';
import { assertAuthSecrets } from './features/auth/config.js';
import { createApiServer } from './routes/api.js';
import { SchemaNotReadyError, assertSchemaReady } from './infrastructure/db/readiness.js';
import { assertSmtpConfigured } from './infrastructure/mail.js';
type StartupStage = 'auth' | 'client-origin' | 'smtp' | 'ai' | 'mysql';
function describeStartupFailure(error: unknown, stage: StartupStage): string {
  if (stage === 'auth' || stage === 'smtp' || stage === 'ai') {
    return error instanceof Error ? error.message : 'Cấu hình không hợp lệ';
  }
  if (stage === 'client-origin') return 'Thiếu CLIENT_ORIGIN';
  if (error instanceof DbEnvError) return error.message;
  if (error instanceof SchemaNotReadyError) {
    return 'MySQL đã kết nối nhưng schema ứng dụng chưa sẵn sàng. Chạy npm run db:preflight (chỉ đọc) và xác nhận đúng target trước khi thay đổi database.';
  }
  const code = typeof error === 'object' && error !== null && 'code' in error &&
      typeof error.code === 'string' && /^[A-Z0-9_]+$/.test(error.code)
    ? ` (${error.code})`
    : '';
  return `Lỗi kết nối hoặc đọc schema MySQL${code}. Chạy npm run db:preflight để kiểm tra chỉ đọc.`;
}

async function main() {
  let stage: StartupStage = 'auth';
  try {
    assertAuthSecrets();
    stage = 'client-origin';
    if (!process.env.CLIENT_ORIGIN) throw new Error('Thiếu CLIENT_ORIGIN');
    stage = 'smtp';
    assertSmtpConfigured();
    stage = 'ai';
    const apiServer = createApiServer();
    stage = 'mysql';
    await assertSchemaReady();
    const port = Number(process.env.PORT || 3000);
    apiServer.listen(port, () => console.log(`Campus Coin API đang chạy ở cổng ${port}`));
  } catch (error) {
    console.error(`Không thể khởi động API: ${describeStartupFailure(error, stage)}`);
    process.exitCode = 1;
  }
}

void main();
