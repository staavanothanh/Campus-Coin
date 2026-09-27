import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

type ApiHeader = {
  $ref?: string;
  schema?: { example?: string };
};

type ApiResponse = {
  $ref?: string;
  headers?: Record<string, ApiHeader>;
};

type ApiDocument = {
  paths: Record<string, Record<string, { responses?: Record<string, ApiResponse> }>>;
  components: {
    responses: Record<string, ApiResponse>;
    headers: Record<string, ApiHeader>;
  };
};

const document = JSON.parse(
  readFileSync(new URL('../artifacts/openapi.json', import.meta.url), 'utf8'),
) as ApiDocument;

function resolveName(reference: string) {
  return reference.split('/').at(-1) || '';
}

test('mọi API response trong OpenAPI khai báo Cache-Control no-store, private', () => {
  for (const [path, methods] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      for (const [status, response] of Object.entries(operation.responses ?? {})) {
        const responseDetails = response.$ref
          ? document.components.responses[resolveName(response.$ref)]
          : response;
        const cacheHeader = responseDetails?.headers?.['Cache-Control'];
        assert.ok(cacheHeader, `${method.toUpperCase()} ${path} ${status} must document Cache-Control`);

        const headerDetails = cacheHeader.$ref
          ? document.components.headers[resolveName(cacheHeader.$ref)]
          : cacheHeader;
        assert.equal(headerDetails?.schema?.example, 'no-store, private');
      }
    }
  }
});
