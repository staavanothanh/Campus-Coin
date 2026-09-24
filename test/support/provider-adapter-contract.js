import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export async function loadAdapter(moduleUrl, exportName) {
  try {
    await access(fileURLToPath(moduleUrl))
  } catch (error) {
    if (error?.code === 'ENOENT') {
      assert.fail(`Missing provider adapter implementation: ${moduleUrl.pathname}`)
    }
    throw error
  }

  const module = await import(moduleUrl.href)
  assert.equal(typeof module[exportName], 'function', `${exportName} must be exported`)
  return module[exportName]
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function createLogCollector() {
  const entries = []
  const logger = Object.fromEntries(
    ['debug', 'info', 'warn', 'error'].map((level) => [
      level,
      (...values) => entries.push({ level, values }),
    ]),
  )
  return { logger, entries }
}
export async function expectErrorCode(promise, code) {
  let error
  try {
    await promise
  } catch (caught) {
    error = caught
  }

  assert.ok(error instanceof Error, `Expected rejection with code ${code}`)
  if (error.message.startsWith('Missing provider adapter implementation:')) {
    throw error
  }
  assert.equal(error.code, code)
  return error
}

export function assertNoSensitiveMarkers(value, markers) {
  const visited = new WeakSet()
  const inspect = (candidate) => {
    if (candidate === null || (typeof candidate !== 'object' && typeof candidate !== 'function')) {
      return typeof candidate === 'string' ? candidate : ''
    }
    if (visited.has(candidate)) return ''
    visited.add(candidate)

    const ownValues = Object.values(candidate)
    if (candidate instanceof Error) {
      ownValues.push(candidate.message, candidate.stack, candidate.cause)
    }
    return ownValues.map(inspect).join('\n')
  }

  const rendered = inspect(value)
  for (const marker of markers) {
    assert.equal(rendered.includes(marker), false, `Sensitive marker leaked: ${marker}`)
  }
}
