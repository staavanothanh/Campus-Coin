import { attachDatabasePool } from '@vercel/functions';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { assertSchemaReady } from '../../src/infrastructure/db/readiness.js';
import { getPool } from '../../src/infrastructure/db/pool.js';
import { createSchemaReadyHandler, handleRequest } from '../../src/routes/api.js';

if (process.env.VERCEL === '1') {
  attachDatabasePool(getPool());
}

type RequestHandler = (request: IncomingMessage, response: ServerResponse) => Promise<unknown>;

export function createVercelHandler(
  checkSchema: () => Promise<void> = assertSchemaReady,
  route: RequestHandler = handleRequest,
): RequestHandler {
  return createSchemaReadyHandler(checkSchema, route);
}

export default createVercelHandler();

export const config = {
  api: {
    bodyParser: false,
  },
};
