import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

import { createApiHandler } from '../../src/api/handler.js'

const openApi = JSON.parse(await readFile(new URL('../../artifacts/openapi.json', import.meta.url), 'utf8'))
const healthOperation = openApi.paths['/health'].get
const sessionOperation = openApi.paths['/auth/session'].get
const API_PREFIX = new URL(openApi.servers.find((server) => server.url.includes('localhost.invalid')).url).pathname.replace(/\/$/, '')
const healthPath = `${API_PREFIX}${Object.keys(openApi.paths).find((path) => path === '/health')}`
const sessionPath = `${API_PREFIX}/auth/session`

function resolveSchema(schema) {
  if (!schema.$ref) return schema

  const value = schema.$ref
    .slice(2)
    .split('/')
    .reduce((current, key) => current[key], openApi)

  return resolveSchema(value)
}

function assertMatchesSchema(value, inputSchema, path = '$') {
  const schema = resolveSchema(inputSchema)
  const actualType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value
  const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type]

  if (schema.type) {
    assert.ok(expectedTypes.includes(actualType), `${path} must have type ${expectedTypes.join(' or ')}`)
  }

  if ('const' in schema) assert.equal(value, schema.const, `${path} must equal its contract constant`)
  if (schema.required) {
    for (const key of schema.required) {
      assert.ok(Object.hasOwn(value, key), `${path}.${key} is required by OpenAPI`)
    }
  }

  for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
    if (Object.hasOwn(value, key)) assertMatchesSchema(value[key], propertySchema, `${path}.${key}`)
  }

  if (schema.format === 'date-time') {
    assert.equal(typeof value, 'string', `${path} must be a date-time string`)
    assert.ok(Number.isFinite(Date.parse(value)), `${path} must parse as a date-time`)
  }
}

describe('Fetch API boundary', () => {
  it('serves liveness publicly, independent of session cookies, in the OpenAPI server base path', async () => {
    assert.deepEqual(healthOperation.security, [])
    assert.equal(API_PREFIX, '/api/v1')
    const healthSchema = healthOperation.responses['200'].content['application/json'].schema
    const handler = createApiHandler({ now: () => new Date('2026-09-26T12:34:56.000Z') })
    const anonymousResponse = await handler(new Request(`https://campus-coin.test${healthPath}`))
    const cookieResponse = await handler(new Request(`https://campus-coin.test${healthPath}`, {
      headers: { cookie: 'cc_session=invalid-session-marker' },
    }))

    assert.equal(anonymousResponse.status, 200)
    assert.equal(cookieResponse.status, 200)
    assert.match(anonymousResponse.headers.get('content-type') ?? '', /^application\/json\b/i)
    assert.equal(anonymousResponse.headers.has('set-cookie'), false)
    assert.equal(cookieResponse.headers.has('set-cookie'), false)
    const anonymousBody = await anonymousResponse.json()
    const cookieBody = await cookieResponse.json()
    assert.deepEqual(cookieBody, anonymousBody)
    assert.equal(anonymousBody.data.timestamp, '2026-09-26T12:34:56.000Z')
    assertMatchesSchema(anonymousBody, healthSchema)
  })

  it('keeps the session operation protected by the OpenAPI session cookie contract', () => {
    const effectiveSecurity = sessionOperation.security ?? openApi.security

    assert.deepEqual(effectiveSecurity, [{ sessionCookie: [] }])
    assert.deepEqual(openApi.components.securitySchemes.sessionCookie, {
      type: 'apiKey',
      in: 'cookie',
      name: 'cc_session',
      description: 'Opaque server-side session cookie; không phải JWT.',
    })
    assert.ok(sessionOperation.responses['200'])
    assert.ok(sessionOperation.responses['401'])
  })

  it('limits nonnegative and positive VND schemas to JavaScript safe integers', () => {
    const maximumSafeInteger = Number.MAX_SAFE_INTEGER

    for (const schemaName of ['MoneyVnd', 'PositiveMoneyVnd']) {
      assert.equal(openApi.components.schemas[schemaName].maximum, maximumSafeInteger)
    }
  })

  it('returns a stable contract-shaped not-found error for unregistered routes', async () => {
    const handler = createApiHandler()
    const response = await handler(new Request(`https://campus-coin.test${API_PREFIX}/unregistered`))

    assert.equal(response.status, 404)
    assert.match(response.headers.get('content-type') ?? '', /^application\/json\b/i)
    assertMatchesSchema(await response.json(), { $ref: '#/components/schemas/ErrorResponse' })
  })

  it('returns not-found rather than fabricating a response for an uncomposed session route', async () => {
    const handler = createApiHandler()
    const response = await handler(new Request(`https://campus-coin.test${sessionPath}`))
    const body = await response.json()

    assert.equal(response.status, 404)
    assert.equal(body.error.code, 'not_found')
    assert.equal(response.headers.has('set-cookie'), false)
  })
})
