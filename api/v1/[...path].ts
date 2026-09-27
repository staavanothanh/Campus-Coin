import { assertAuthSecrets } from '../../src/features/auth/config.js';
assertAuthSecrets();
import { attachDatabasePool } from '@vercel/functions';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createCategorySuggestionServiceFromEnvironment } from '../../src/application/jev/category-suggestion-service.js';
import { getPool } from '../../src/infrastructure/db/pool.js';
import { handleRequest } from '../../src/routes/api.js';
const jevService = createCategorySuggestionServiceFromEnvironment();
if (process.env.VERCEL === '1') {
  attachDatabasePool(getPool());
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await handleRequest(request, response, undefined, undefined, jevService);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
