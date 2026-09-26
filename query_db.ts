import { createPool } from 'mysql2/promise';
import { readDbEnv } from './src/infrastructure/db/env.js';
import { createOAuthChallengeStore } from './src/infrastructure/session.repository.js';

async function main() {
  const e = readDbEnv();
  const pool = createPool({
    host: e.host,
    port: e.port,
    database: e.database,
    user: e.user,
    password: e.password,
    ssl: { rejectUnauthorized: false }
  });
  
  const repo = createOAuthChallengeStore(pool);
  
  const state = 'a9e11461a425dbae50afb3bcac5e5d7f03c6699c12d79d4d8baac7b696b5ff4f';
  try {
    const challenge = await repo.consumeByState(state);
    console.log('Consumed challenge:', challenge);
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

main();
