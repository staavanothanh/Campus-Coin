import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assertNoSensitiveMarkers,
  createLogCollector,
  expectErrorCode,
  jsonResponse,
  loadAdapter,
} from '../support/provider-adapter-contract.js'

const adapterModule = new URL('../../src/infrastructure/providers/nghienai-chat.js', import.meta.url)
const apiKey = 'test-nghienai-key'
const sensitivePrompt = 'SENSITIVE_NGHIENAI_PROMPT_MARKER'
const rawPayloadMarker = 'RAW_NGHIENAI_ERROR_MARKER'
const baseUrl = 'https://api.aixingialaire.shop/v1'
const model = 'gpt-6-luna'
const messages = [
  { role: 'system', content: 'Classify only the supplied description.' },
  { role: 'user', content: sensitivePrompt },
]

function chatCompletion(overrides = {}) {
  return {
    id: 'chatcmpl-test',
    model,
    choices: [
      { message: { role: 'assistant', content: 'groceries' } },
    ],
    ...overrides,
  }
}

async function createNghienAdapter(options = {}) {
  const createAdapter = await loadAdapter(adapterModule, 'createNghienAiChatAdapter')
  return createAdapter({
    apiKey,
    baseUrl,
    model,
    fetchImpl: options.fetchImpl ?? (async () => jsonResponse(chatCompletion())),
    logger: options.logger ?? console,
    timeoutMs: options.timeoutMs,
  })
}

async function getRejection(promise, code) {
  const error = await assert.rejects(promise)
  assert.equal(error.code, code)
  return error
}

describe('NghienAI gpt-6-luna provisional OpenAI-compatible HTTP contract', () => {
  it('posts to the supplied v1 Chat Completions path and preserves the exact requested model ID', async () => {
    let request
    const client = await createNghienAdapter({
      fetchImpl: async (url, options) => {
        request = { url, options }
        return jsonResponse(chatCompletion())
      },
    })

    await client.complete({ messages })

    assert.equal(request.url, `${baseUrl}/chat/completions`)
    assert.equal(request.options.method, 'POST')
    assert.equal(request.options.headers.authorization, `Bearer ${apiKey}`)
    assert.equal(request.options.headers['content-type'], 'application/json')
    assert.deepEqual(JSON.parse(request.options.body), { model, messages })
  })

  it('accepts a minimal Chat Completions response with an assistant message', async () => {
    const client = await createNghienAdapter({ fetchImpl: async () => jsonResponse(chatCompletion()) })

    const result = await client.complete({ messages })

    assert.equal(typeof result.model, 'string')
    assert.equal(result.choices[0].message.role, 'assistant')
    assert.equal(result.choices[0].message.content, 'groceries')
  })

  it('rejects a missing or malformed completion shape, including invalid JSON', async (context) => {
    const invalidResponses = [
      { label: 'missing response fields', response: jsonResponse({}) },
      { label: 'no choices', response: jsonResponse({ id: 'chatcmpl-test', model, choices: [] }) },
      { label: 'missing assistant message', response: jsonResponse({ id: 'chatcmpl-test', model, choices: [{ index: 0, finish_reason: 'stop' }] }) },
      { label: 'invalid message shape', response: jsonResponse({ id: 'chatcmpl-test', model, choices: [{ index: 0, message: { role: 'assistant', content: null }, finish_reason: 'stop' }] }) },
      { label: 'malformed JSON', response: new Response('{not-json', { status: 200, headers: { 'content-type': 'application/json' } }) },
    ]

    for (const { label, response } of invalidResponses) {
      await context.test(label, async () => {
        const client = await createNghienAdapter({ fetchImpl: async () => response })
        await expectErrorCode(client.complete({ messages }), 'invalid_provider_response')
      })
    }
  })
  it('normalizes provider HTTP errors without leaking the key or raw error payload into errors or logs', async () => {
    const { logger, entries } = createLogCollector()
    const client = await createNghienAdapter({
      logger,
      fetchImpl: async () => jsonResponse({ error: rawPayloadMarker, prompt: sensitivePrompt }, 429),
    })

    const error = await expectErrorCode(client.complete({ messages }), 'provider_http_error')

    assert.equal(error.status, 429)
    assertNoSensitiveMarkers(error, [apiKey, sensitivePrompt, rawPayloadMarker])
    assertNoSensitiveMarkers(entries, [apiKey, sensitivePrompt, rawPayloadMarker])
  })

  it('normalizes timeout aborts without leaking credentials or prompt data into errors or logs', async () => {
    const { logger, entries } = createLogCollector()
    const client = await createNghienAdapter({
      logger,
      timeoutMs: 10,
      fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
        const rejectAsAbort = () => reject(new DOMException(`${apiKey} ${sensitivePrompt}`, 'AbortError'))
        if (options.signal.aborted) rejectAsAbort()
        else options.signal.addEventListener('abort', rejectAsAbort, { once: true })
      }),
    })

    const error = await expectErrorCode(client.complete({ messages }), 'provider_timeout')

    assertNoSensitiveMarkers(error, [apiKey, sensitivePrompt])
    assertNoSensitiveMarkers(entries, [apiKey, sensitivePrompt])
  })
})
