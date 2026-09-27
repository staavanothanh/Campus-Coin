import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assertNoSensitiveMarkers,
  createLogCollector,
  expectErrorCode,
  jsonResponse,
  loadAdapter,
} from '../support/provider-adapter-contract.js'

const adapterModule = new URL('../../src/infrastructure/providers/openrouter-jev.js', import.meta.url)
const apiKey = 'test-openrouter-key'
const sensitivePrompt = 'SENSITIVE_JEV_PROMPT_MARKER'
const rawPayloadMarker = 'RAW_OPENROUTER_PAYLOAD_MARKER'

const state = { transactionType: 'income', description: sensitivePrompt, locale: 'en', contractVersion: 'jev-category-v1' }
const questions = {
  category: {
    type: 'choice',
    instructions: 'Choose the matching candidate category.',
    criteria: {
      groceries: 'Food and household essentials.',
      other_or_uncertain: 'No candidate fits or the choice is uncertain.',
    },
  },
}

function choiceResponse(overrides = {}) {
  return {
    id: 'gen-dec-test',
    model: 'typesafe/jev-1.13-20260917',
    provider: 'TypeSafe',
    answers: {
      category: {
        type: 'choice',
        choice: 'groceries',
        probabilities: { groceries: 0.84, other_or_uncertain: 0.16 },
        confidence: 0.84,
      },
    },
    usage: { input_tokens: 22, output_tokens: 6, cost: 0.00002 },
    ...overrides,
  }
}

async function createJevAdapter(options = {}) {
  const createAdapter = await loadAdapter(adapterModule, 'createOpenRouterJevAdapter')
  return createAdapter({
    apiKey,
    fetchImpl: options.fetchImpl ?? (async () => jsonResponse(choiceResponse())),
    logger: options.logger ?? createLogCollector().logger,
    timeoutMs: options.timeoutMs,
  })
}


describe('OpenRouter System One JEV 1.13 HTTP contract', () => {
  it('posts the pinned model and typed Choice question to the documented System One endpoint', async () => {
    let request
    const client = await createJevAdapter({
      fetchImpl: async (url, options) => {
        request = { url, options }
        return jsonResponse(choiceResponse())
      },
    })

    await client.decide({ state, questions })

    assert.equal(request.url, 'https://openrouter.ai/api/v1/systemone')
    assert.equal(request.options.method, 'POST')
    assert.equal(request.options.headers.authorization, `Bearer ${apiKey}`)
    assert.equal(request.options.headers['content-type'], 'application/json')
    assert.deepEqual(JSON.parse(request.options.body), {
      model: 'typesafe/jev-1.13',
      state,
      questions,
    })
  })
  it('rejects sensitive state at the adapter boundary before invoking fetch', async (context) => {
    for (const [label, description] of [
      ['email', 'Lunch contact ana@example.com'],
      ['bearer credential', 'Lunch note Bearer synthetic-token-value'],
      ['colon bearer credential', 'Lunch note Bearer: synthetic-token-value'],
      ['equals bearer credential', 'Lunch note Bearer=synthetic-token-value'],
      ['labelled identifier', 'Transfer account: 12345678'],
    ]) {
      await context.test(label, async () => {
        let providerRequests = 0
        const client = await createJevAdapter({
          fetchImpl: async () => { providerRequests += 1; return jsonResponse(choiceResponse()) },
        })

        await expectErrorCode(client.decide({ state: { ...state, description }, questions }), 'invalid_provider_request')
        assert.equal(providerRequests, 0)
      })
    }
  })
  it('requires exactly the supported state contract before invoking fetch', async (context) => {
    const invalidStates = [
      ...Object.keys(state).map((field) => [
        `missing ${field}`,
        Object.fromEntries(Object.entries(state).filter(([key]) => key !== field)),
      ]),
      ['unsupported transactionType', { ...state, transactionType: 'transfer' }],
      ['unsupported locale', { ...state, locale: 'fr' }],
      ['unsupported contractVersion', { ...state, contractVersion: 'jev-category-v2' }],
      ['amountVnd', { ...state, amountVnd: 120000 }],
      ['balance', { ...state, balance: 900000 }],
      ['session', { ...state, session: 'synthetic-session' }],
      ['secret', { ...state, secret: 'synthetic-secret' }],
    ]
    for (const [label, invalidState] of invalidStates) {
      await context.test(label, async () => {
        let providerRequests = 0
        const client = await createJevAdapter({
          fetchImpl: async () => { providerRequests += 1; return jsonResponse(choiceResponse()) },
        })

        await expectErrorCode(client.decide({ state: invalidState, questions }), 'invalid_provider_request')
        assert.equal(providerRequests, 0)
      })
    }
  })
  it('rejects unsafe question IDs, fields and criteria before invoking fetch', async (context) => {
    const invalidQuestions = [
      ['unknown question ID', { alternate: questions.category }],
      ['extra question property', { category: { ...questions.category, context: 'include account history' } }],
      ['sensitive candidate label', { category: { ...questions.category, criteria: { groceries: 'Account 12345678', other_or_uncertain: questions.category.criteria.other_or_uncertain } } }],
    ]
    for (const [label, invalidQuestionSet] of invalidQuestions) {
      await context.test(label, async () => {
        let providerRequests = 0
        const client = await createJevAdapter({
          fetchImpl: async () => { providerRequests += 1; return jsonResponse(choiceResponse()) },
        })

        await expectErrorCode(client.decide({ state, questions: invalidQuestionSet }), 'invalid_provider_request')
        assert.equal(providerRequests, 0)
      })
    }
  })




  it('accepts a typed Choice answer with candidate probabilities and confidence', async () => {
    const client = await createJevAdapter({ fetchImpl: async () => jsonResponse(choiceResponse()) })

    const result = await client.decide({ state, questions })

    assert.equal(result.answers.category.type, 'choice')
    assert.equal(result.answers.category.choice, 'groceries')
    assert.deepEqual(result.answers.category.probabilities, {
      groceries: 0.84,
      other_or_uncertain: 0.16,
    })
    assert.equal(result.answers.category.confidence, 0.84)
    assert.match(result.model, /^typesafe\/jev-1\.13(?:-|$)/)
  })

  it('rejects missing, malformed JSON, or structurally invalid typed answers', async (context) => {
    const invalidResponses = [
      { label: 'missing response fields', response: jsonResponse({}) },
      { label: 'missing requested answer', response: jsonResponse({ model: 'typesafe/jev-1.13', answers: {}, usage: { input_tokens: 1, output_tokens: 1 } }) },
      { label: 'choice outside configured candidates', response: jsonResponse({ model: 'typesafe/jev-1.13', answers: { category: { type: 'choice', choice: 'not-a-candidate', probabilities: {}, confidence: 1 } }, usage: { input_tokens: 1, output_tokens: 1 } }) },
      { label: 'probability and confidence outside range', response: jsonResponse({ model: 'typesafe/jev-1.13', answers: { category: { type: 'choice', choice: 'groceries', probabilities: { groceries: 2 }, confidence: 2 } }, usage: { input_tokens: 1, output_tokens: 1 } }) },
      { label: 'malformed JSON', response: new Response('{not-json', { status: 200, headers: { 'content-type': 'application/json' } }) },
    ]

    for (const { label, response } of invalidResponses) {
      await context.test(label, async () => {
        const client = await createJevAdapter({ fetchImpl: async () => response })
        await expectErrorCode(client.decide({ state, questions }), 'invalid_provider_response')
      })
    }
  })
  it('accepts optional usage and optional Choice probabilities/confidence from System One', async () => {
    const payload = {
      model: 'typesafe/jev-1.13',
      answers: { category: { type: 'choice', choice: 'groceries' } },
    }
    const client = await createJevAdapter({ fetchImpl: async () => jsonResponse(payload) })

    assert.deepEqual(await client.decide({ state, questions }), payload)
  })

  it('rejects inconsistent probability distributions and selected choices below the maximum', async (context) => {
    const invalidResponses = [
      {
        label: 'probabilities do not sum to one',
        response: jsonResponse({
          model: 'typesafe/jev-1.13',
          answers: { category: { type: 'choice', choice: 'groceries', probabilities: { groceries: 0.3, other_or_uncertain: 0.3 } } },
        }),
      },
      {
        label: 'selected choice is not a maximum',
        response: jsonResponse({
          model: 'typesafe/jev-1.13',
          answers: { category: { type: 'choice', choice: 'groceries', probabilities: { groceries: 0.2, other_or_uncertain: 0.8 } } },
        }),
      },
    ]

    for (const { label, response } of invalidResponses) {
      await context.test(label, async () => {
        const client = await createJevAdapter({ fetchImpl: async () => response })
        await expectErrorCode(client.decide({ state, questions }), 'invalid_provider_response')
      })
    }
  })


  it('normalizes documented provider HTTP error statuses without exposing response payloads', async (context) => {
    for (const status of [400, 401, 402, 403, 404, 413, 429, 500, 502, 503, 524, 529]) {
      await context.test(String(status), async () => {
        const { logger, entries } = createLogCollector()
        const client = await createJevAdapter({
          logger,
          fetchImpl: async () => jsonResponse({ error: { code: status, message: rawPayloadMarker }, echo: sensitivePrompt }, status),
        })

        const error = await expectErrorCode(client.decide({ state, questions }), 'provider_http_error')

        assert.equal(error.status, status)
        assertNoSensitiveMarkers(error, [apiKey, sensitivePrompt, rawPayloadMarker])
        assertNoSensitiveMarkers(entries, [apiKey, sensitivePrompt, rawPayloadMarker])
      })
    }
  })
  it('rejects redirects without following a second request', async () => {
    const requests = []
    const client = await createJevAdapter({
      fetchImpl: async (url, options) => {
        requests.push({ url, options })
        assert.equal(options.redirect, 'error')
        return new Response(null, { status: 302, headers: { location: 'https://unexpected.example/jev' } })
      },
    })

    await expectErrorCode(client.decide({ state, questions }), 'provider_http_error')
    assert.equal(requests.length, 1)
  })
  it('caps candidate sets at the provider limit of 255', async () => {
    const criteria = Object.fromEntries(Array.from({ length: 256 }, (_value, index) => [`category_${index}`, 'label']))
    const client = await createJevAdapter()

    await expectErrorCode(client.decide({
      state,
      questions: { category: { type: 'choice', instructions: 'Choose.', criteria } },
    }), 'invalid_provider_request')
  })

  it('normalizes a timeout while parsing the provider response body', async () => {
    const client = await createJevAdapter({
      timeoutMs: 10,
      fetchImpl: async () => ({
        status: 200,
        json: () => new Promise(() => {}),
      }),
    })

    await expectErrorCode(client.decide({ state, questions }), 'provider_timeout')
  })
  it('rejects provider response bodies above the bounded size limit', async () => {
    const client = await createJevAdapter({
      fetchImpl: async () => jsonResponse({ ...choiceResponse(), padding: 'x'.repeat(65_536) }),
    })

    await expectErrorCode(client.decide({ state, questions }), 'invalid_provider_response')
  })



  it('normalizes timeout aborts and keeps sensitive request and abort details out of errors and logs', async () => {
    const { logger, entries } = createLogCollector()
    const client = await createJevAdapter({
      logger,
      timeoutMs: 10,
      fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
        const rejectAsAbort = () => reject(new DOMException(`${apiKey} ${sensitivePrompt}`, 'AbortError'))
        if (options.signal.aborted) rejectAsAbort()
        else options.signal.addEventListener('abort', rejectAsAbort, { once: true })
      }),
    })

    const error = await expectErrorCode(client.decide({ state, questions }), 'provider_timeout')

    assertNoSensitiveMarkers(error, [apiKey, sensitivePrompt])
    assertNoSensitiveMarkers(entries, [apiKey, sensitivePrompt])
  })
})
