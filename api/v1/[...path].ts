import { attachDatabasePool } from '@vercel/functions';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getPool } from '../../src/infrastructure/db/pool.js';
import { handleRequest } from '../../src/routes/api.js';

if (process.env.VERCEL === '1') {
  attachDatabasePool(getPool());
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await handleRequest(request, response);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
