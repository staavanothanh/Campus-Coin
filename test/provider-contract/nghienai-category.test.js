import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createLogCollector,
  expectErrorCode,
  jsonResponse,
  loadAdapter,
} from '../support/provider-adapter-contract.js'

const adapterModule = new URL('../../src/infrastructure/providers/nghienai-category.js', import.meta.url)
const apiKey = 'test-nghienai-key'
const model = 'gpt-6-luna'

const state = {
  transactionType: 'payment',
  description: 'Lunch at campus',
  locale: 'en',
  contractVersion: 'jev-category-v1',
}

const criteria = {
  groceries: 'Food and household essentials',
  transport: 'Public transport',
  other_or_uncertain: 'No candidate fits or the choice is uncertain.',
}

const questions = {
  category: { type: 'choice', instructions: 'Choose the matching candidate category.', criteria },
}

function chatCompletion(content) {
  return {
    id: 'chatcmpl-test',
    model,
    choices: [{ message: { role: 'assistant', content } }],
  }
}

async function createAdapter(options = {}) {
  const createAdapter = await loadAdapter(adapterModule, 'createNghienAiCategoryAdapter')
  return createAdapter({
    apiKey,
    fetchImpl: options.fetchImpl ?? (async () => jsonResponse(chatCompletion(JSON.stringify({ category: 'groceries', confidence: 0.9 })))),
    logger: options.logger ?? console,
    timeoutMs: options.timeoutMs,
  })
}

describe('NghienAI category adapter (shared decide contract)', () => {
  it('classifies a description into the exact candidate set and maps to the shared choice shape', async () => {
    let request
    const adapter = await createAdapter({
      fetchImpl: async (_url, options) => {
        request = { url: _url, body: JSON.parse(options.body) }
        return jsonResponse(chatCompletion(JSON.stringify({ category: 'groceries', confidence: 0.9 })))
      },
    })

    const result = await adapter.decide({ state, questions })

    assert.deepEqual(result.answers, {
      category: { type: 'choice', choice: 'groceries', confidence: 0.9 },
    })
    assert.equal(result.model, model)
    assert.equal(request.body.model, model)
    assert.deepEqual(request.body.messages[0].role, 'system')
    assert.match(request.body.messages[1].content, /Lunch at campus/)
    assert.match(request.body.messages[1].content, /groceries: Food and household essentials/)
  })

  it('accepts a JSON response wrapped in a markdown code fence', async () => {
    const adapter = await createAdapter({
      fetchImpl: async () => jsonResponse(chatCompletion('```json\n{"category":"transport","confidence":0.85}\n```')),
    })
    const result = await adapter.decide({ state, questions })
    assert.equal(result.answers.category.choice, 'transport')
    assert.equal(result.answers.category.confidence, 0.85)
  })

  it('rejects a choice outside the configured candidate set', async () => {
    const adapter = await createAdapter({
      fetchImpl: async () => jsonResponse(chatCompletion(JSON.stringify({ category: 'not-a-candidate', confidence: 0.9 }))),
    })
    await expectErrorCode(adapter.decide({ state, questions }), 'invalid_provider_response')
  })

  it('rejects malformed or non-JSON provider content', async () => {
    const adapter = await createAdapter({
      fetchImpl: async () => jsonResponse(chatCompletion('not json at all')),
    })
    await expectErrorCode(adapter.decide({ state, questions }), 'invalid_provider_response')
  })

  it('rejects a missing or out-of-range confidence value', async () => {
    const adapter = await createAdapter({
      fetchImpl: async () => jsonResponse(chatCompletion(JSON.stringify({ category: 'groceries', confidence: 2 }))),
    })
    await expectErrorCode(adapter.decide({ state, questions }), 'invalid_provider_response')
  })

  it('rejects invalid decision requests before any provider call', async () => {
    let calls = 0
    const adapter = await createAdapter({ fetchImpl: async () => { calls += 1; return jsonResponse(chatCompletion('{}')) } })

    await expectErrorCode(
      adapter.decide({ state: { ...state, transactionType: 'transfer' }, questions }),
      'invalid_provider_request',
    )
    await expectErrorCode(
      adapter.decide({ state: { ...state, contractVersion: 'jev-category-v2' }, questions }),
      'invalid_provider_request',
    )
    await expectErrorCode(
      adapter.decide({ state, questions: { category: { type: 'choice', criteria: { only: 'single' } } } }),
      'invalid_provider_request',
    )
    assert.equal(calls, 0)
  })

  it('propagates normalized provider HTTP errors without leaking credentials', async () => {
    const { logger, entries } = createLogCollector()
    const adapter = await createAdapter({
      logger,
      fetchImpl: async () => jsonResponse({ error: 'quota exceeded' }, 429),
    })
    const error = await expectErrorCode(adapter.decide({ state, questions }), 'provider_http_error')
    assert.equal(error.status, 429)
    assert.equal(JSON.stringify(entries).includes(apiKey), false)
  })
})
