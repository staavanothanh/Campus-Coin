import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';

const ENV_FILE = '.env';

export function loadRuntimeEnvironment(env: NodeJS.ProcessEnv = process.env, filePath = ENV_FILE): void {
  let fileEnv: Record<string, string>;
  try {
    fileEnv = dotenv.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }

  for (const [name, value] of Object.entries(fileEnv)) {
    if (env[name] === undefined || env[name] === '') env[name] = value;
  }
}
