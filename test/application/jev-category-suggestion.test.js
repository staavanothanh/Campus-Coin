import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createCategorySuggestionService, createCategorySuggestionServiceFromEnvironment } from '../../src/application/jev/category-suggestion-service.js'

const categories = [
  { id: 'groceries', semanticLabel: 'Food and household essentials', active: true, appliesTo: ['payment'] },
  { id: 'stipend', semanticLabel: 'Student stipend', active: true, appliesTo: ['income'] },
  { id: 'retired', semanticLabel: 'Retired category', active: false, appliesTo: ['payment'] },
]
const configuredPolicy = { enabled: true, minimumConfidence: 0.8, maxCandidates: 10 }
const eligibleInput = {
  transactionType: 'payment', descriptionRedacted: 'Lunch at campus', locale: 'en', candidates: categories,
}

function choice({ choice: selected = 'groceries', confidence = 0.9 } = {}) {
  const probabilities = selected === 'other_or_uncertain'
    ? { groceries: 0.1, other_or_uncertain: 0.9 }
    : { groceries: 0.9, other_or_uncertain: 0.1 }
  return {
    answers: { category: { type: 'choice', choice: selected, confidence, probabilities } },
    model: 'typesafe/jev-1.13-20260917', usage: { input_tokens: 1, output_tokens: 1 },
  }
}

describe('JEV category suggestion application boundary', () => {
  it('keeps manual fallback available without invoking the provider when the feature is off', async () => {
    let calls = 0
    const service = createCategorySuggestionService({ adapter: { decide: async () => { calls += 1; return choice() } } })
    assert.deepEqual(await service.suggest(eligibleInput), { status: 'disabled', categoryId: null, confidence: null, reasonCode: 'flag_off' })
    assert.equal(calls, 0)
  })

  it('keeps the feature disabled without valid confidence/candidate bounds', async (context) => {
    const cases = [
      { name: 'missing threshold', minimumConfidence: null, maxCandidates: 10 },
      { name: 'invalid threshold', minimumConfidence: 2, maxCandidates: 10 },
      { name: 'missing candidate bound', minimumConfidence: 0.8, maxCandidates: null },
      { name: 'invalid candidate bound', minimumConfidence: 0.8, maxCandidates: 0 },
      { name: 'unapproved candidate bound', minimumConfidence: 0.8, maxCandidates: 255 },
    ]
    for (const policy of cases) {
      await context.test(policy.name, async () => {
        let calls = 0
        const service = createCategorySuggestionService({
          enabled: true, minimumConfidence: policy.minimumConfidence, maxCandidates: policy.maxCandidates,
          adapter: { decide: async () => { calls += 1; return choice() } },
        })
        assert.deepEqual(await service.suggest(eligibleInput), { status: 'disabled', categoryId: null, confidence: null, reasonCode: null })
        assert.equal(calls, 0)
      })
    }
  })

  it('does not send candidates exceeding configured bound', async () => {
    let calls = 0
    const service = createCategorySuggestionService({ ...configuredPolicy, maxCandidates: 1,
      adapter: { decide: async () => { calls += 1; return choice() } } })
    const input = { ...eligibleInput, candidates: [...categories, { id: 'transport', semanticLabel: 'Public transport', active: true, appliesTo: ['payment'] }] }
    assert.deepEqual(await service.suggest(input), { status: 'manual', categoryId: null, confidence: null, reasonCode: 'schema' })
    assert.equal(calls, 0)
  })

  it('reserves one provider choice for other_or_uncertain', async () => {
    let calls = 0
    const service = createCategorySuggestionService({ ...configuredPolicy, maxCandidates: 254,
      adapter: { decide: async () => { calls += 1; return choice() } } })
    const manyCategories = Array.from({ length: 255 }, (_value, index) => ({
      id: `category_${index}`, semanticLabel: `Category ${index}`, active: true, appliesTo: ['payment'],
    }))
    assert.deepEqual(await service.suggest({ ...eligibleInput, candidates: manyCategories }), { status: 'manual', categoryId: null, confidence: null, reasonCode: 'schema' })
    assert.equal(calls, 0)
  })

  it('returns manual fallback for invalid and null input', async () => {
    let calls = 0
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async () => { calls += 1; return choice() } } })
    assert.deepEqual(await service.suggest({ ...eligibleInput, transactionType: 'transfer', descriptionRedacted: ' ', locale: 'fr' }), {
      status: 'manual', categoryId: null, confidence: null, reasonCode: 'schema',
    })
    assert.deepEqual(await service.suggest(null), { status: 'manual', categoryId: null, confidence: null, reasonCode: 'schema' })
    assert.equal(calls, 0)
  })

  it('redacts email and phone data before provider invocation', async () => {
    let sentState
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async ({ state }) => { sentState = state; return choice() } } })
    await service.suggest({ ...eligibleInput, descriptionRedacted: 'Lunch contact ana@example.com at +1 415 555 2671' })
    assert.equal(sentState.description.includes('ana@example.com'), false)
    assert.equal(sentState.description.includes('415 555 2671'), false)
    assert.match(sentState.description, /\[REDACTED\]/)
  })

  it('does not send bearer credentials and redacts detected address/cookie patterns', async () => {
    let calls = 0
    let sentDescription
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async ({ state }) => { calls += 1; sentDescription = state.description; return choice() } } })
    const bearerResult = await service.suggest({ ...eligibleInput, descriptionRedacted: 'Transfer note: Bearer abcdefghijklmnopqrstuvwxyz' })
    assert.deepEqual(bearerResult, { status: 'manual', categoryId: null, confidence: null, reasonCode: 'privacy' })
    assert.equal(calls, 0)

    await service.suggest({ ...eligibleInput, descriptionRedacted: '12 Nguyen Trai, District 1' })
    assert.equal(sentDescription.includes('Nguyen Trai'), false)
    assert.equal(sentDescription.includes('District 1'), false)
    await service.suggest({ ...eligibleInput, descriptionRedacted: 'Cookie: session=abc123' })
    assert.equal(sentDescription.includes('abc123'), false)
    assert.equal(calls, 2)
  })
  it('removes natural-language credential values before provider invocation', async () => {
    let sentDescription
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async ({ state }) => { sentDescription = state.description; return choice() } } })
    await service.suggest({ ...eligibleInput, descriptionRedacted: 'My password is hunter2' })
    assert.equal(sentDescription.includes('hunter2'), false)
    assert.match(sentDescription, /\[REDACTED\]/)
  })

  it('fails closed on an ambiguous API-key boundary rather than retaining a suffix', async () => {
    let calls = 0
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async () => { calls += 1; return choice() } } })
    const result = await service.suggest({
      ...eligibleInput,
      descriptionRedacted: 'My API key is sk-test-secret-value after lunch at Cafe Lotus',
    })
    assert.deepEqual(result, { status: 'manual', categoryId: null, confidence: null, reasonCode: 'privacy' })
    assert.equal(calls, 0)
  })

  it('redacts API keys through a delimiter without discarding following transaction context', async () => {
    let sentDescription
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async ({ state }) => { sentDescription = state.description; return choice() } } })
    await service.suggest({
      ...eligibleInput,
      descriptionRedacted: 'My API key is sk-test-secret-value, payment at Cafe Lotus',
    })
    assert.equal(sentDescription, 'My [REDACTED], payment at Cafe Lotus')
    assert.equal(sentDescription.includes('sk-test-secret-value'), false)
  })

  it('redacts multi-token API keys through a delimiter and preserves following context', async () => {
    let sentDescription
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async ({ state }) => { sentDescription = state.description; return choice() } } })
    await service.suggest({
      ...eligibleInput,
      descriptionRedacted: 'My API key is alpha beta, payment at Cafe Lotus',
    })
    assert.equal(sentDescription, 'My [REDACTED], payment at Cafe Lotus')
    assert.equal(sentDescription.includes('alpha'), false)
    assert.equal(sentDescription.includes('beta'), false)
  })

  it('fails closed when a multi-token credential has no unambiguous delimiter', async () => {
    let calls = 0
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async () => { calls += 1; return choice() } } })
    const result = await service.suggest({
      ...eligibleInput,
      descriptionRedacted: 'My API key is alpha beta',
    })
    assert.deepEqual(result, { status: 'manual', categoryId: null, confidence: null, reasonCode: 'privacy' })
    assert.equal(calls, 0)
  })

  it('redacts bare and environment-style API key labels before provider invocation', async () => {
    const sentDescriptions = []
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async ({ state }) => { sentDescriptions.push(state.description); return choice() } } })
    for (const descriptionRedacted of [
      'API key sk-example-secret-value',
      'OPENROUTER_API_KEY=sk-example-secret-value',
    ]) {
      const result = await service.suggest({ ...eligibleInput, descriptionRedacted })
      assert.equal(result.status, 'suggested')
    }
    assert.deepEqual(sentDescriptions, ['[REDACTED]', '[REDACTED]'])
  })
  it('redacts labelled internal identifiers before adapter invocation', async () => {
    let sentDescription
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async ({ state }) => { sentDescription = state.description; return choice() } } })
    const result = await service.suggest({ ...eligibleInput, descriptionRedacted: 'Transfer for account: c12345678' })
    assert.equal(result.status, 'suggested')
    assert.equal(sentDescription.includes('c12345678'), false)
    assert.match(sentDescription, /\[REDACTED\]/)
  })

  it('preserves benign numeric details through the service boundary', async () => {
    let sentDescription
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async ({ state }) => { sentDescription = state.description; return choice() } } })
    const result = await service.suggest({ ...eligibleInput, descriptionRedacted: 'Salary for 2026-09, shift 2' })
    assert.equal(result.status, 'suggested')
    assert.equal(sentDescription, 'Salary for 2026-09, shift 2')
  })

  it('maps Choice answers without confidence to manual fallback', async () => {
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async () => ({ answers: { category: { type: 'choice', choice: 'groceries' } } }) } })
    assert.deepEqual(await service.suggest(eligibleInput), { status: 'manual', categoryId: null, confidence: null, reasonCode: 'schema' })
  })

  it('sends active candidates and maps a valid typed Choice', async () => {
    let request
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async (input) => { request = input; return choice() } } })
    const result = await service.suggest(eligibleInput)
    assert.deepEqual(request.state, { transactionType: 'payment', description: 'Lunch at campus', locale: 'en', contractVersion: 'jev-category-v1' })
    assert.deepEqual(request.questions.category.criteria, {
      groceries: 'Food and household essentials', other_or_uncertain: 'No candidate fits or the choice is uncertain.',
    })
    assert.deepEqual(result, { status: 'suggested', categoryId: 'groceries', confidence: 0.9, reasonCode: null })
  })

  it('returns manual fallback for low confidence and abstention choices', async (context) => {
    const cases = [
      { name: 'below threshold', result: choice({ confidence: 0.79 }), confidence: 0.79 },
      { name: 'other or uncertain', result: choice({ choice: 'other_or_uncertain' }), confidence: 0.9 },
    ]
    for (const example of cases) {
      await context.test(example.name, async () => {
        const service = createCategorySuggestionService({ ...configuredPolicy, adapter: { decide: async () => example.result } })
        assert.deepEqual(await service.suggest(eligibleInput), { status: 'manual', categoryId: null, confidence: example.confidence, reasonCode: 'low_confidence' })
      })
    }
  })

  it('rejects output outside the eligible candidate set', async () => {
    const service = createCategorySuggestionService({ ...configuredPolicy, adapter: { decide: async () => choice({ choice: 'stipend' }) } })
    assert.deepEqual(await service.suggest(eligibleInput), { status: 'manual', categoryId: null, confidence: null, reasonCode: 'schema' })
  })

  it('normalizes provider timeout and quota failures to manual fallback', async (context) => {
    const cases = [
      { name: 'timeout', error: Object.assign(new Error('sensitive'), { code: 'provider_timeout' }), reasonCode: 'timeout' },
      { name: 'quota', error: Object.assign(new Error('sensitive'), { code: 'provider_http_error', status: 429 }), reasonCode: 'quota' },
    ]
    for (const example of cases) {
      await context.test(example.name, async () => {
        const service = createCategorySuggestionService({ ...configuredPolicy, adapter: { decide: async () => { throw example.error } } })
        assert.deepEqual(await service.suggest(eligibleInput), { status: 'manual', categoryId: null, confidence: null, reasonCode: example.reasonCode })
      })
    }
  })

  it('does not instantiate OpenRouter without an approved policy', async () => {
    const service = createCategorySuggestionServiceFromEnvironment({
      env: { JEV_CATEGORY_SUGGESTION_ENABLED: 'false', OPENROUTER_API_KEY: 'synthetic-disabled-key' }, loadEnvFile: () => {},
    })
    assert.deepEqual(await service.suggest(eligibleInput), { status: 'disabled', categoryId: null, confidence: null, reasonCode: 'flag_off' })
  })

  it('instantiates server-side JEV without returning its API key', async () => {
    let request
    const service = createCategorySuggestionServiceFromEnvironment({
      env: { JEV_CATEGORY_SUGGESTION_ENABLED: 'true', OPENROUTER_API_KEY: 'synthetic-server-key', JEV_MINIMUM_CONFIDENCE: '0.8', JEV_MAX_CANDIDATES: '10' },
      loadEnvFile: () => {},
      fetchImpl: async (_url, options) => { request = options; return new Response(JSON.stringify(choice()), { status: 200 }) },
      logger: { warn: () => {} },
    })
    const result = await service.suggest(eligibleInput)
    assert.equal(request.headers.authorization, 'Bearer synthetic-server-key')
    assert.equal(result.status, 'suggested')
    assert.equal(JSON.stringify(result).includes('synthetic-server-key'), false)
  })

  it('keeps JEV disabled when only a server API key is configured', async () => {
    let calls = 0
    const service = createCategorySuggestionServiceFromEnvironment({
      env: { OPENROUTER_API_KEY: 'synthetic-server-key' },
      loadEnvFile: () => {},
      fetchImpl: async () => {
        calls += 1
        return new Response(JSON.stringify(choice()), { status: 200 })
      },
      logger: { warn: () => {} },
    })
    const result = await service.suggest(eligibleInput)
    assert.deepEqual(result, { status: 'disabled', categoryId: null, confidence: null, reasonCode: 'flag_off' })
    assert.equal(calls, 0)
  })

  it('returns unavailable without echoing provider details', async () => {
    const service = createCategorySuggestionService({ ...configuredPolicy,
      adapter: { decide: async () => { throw new Error('RAW provider payload and secret') } } })
    assert.deepEqual(await service.suggest(eligibleInput), { status: 'unavailable', categoryId: null, confidence: null, reasonCode: null })
  })
})
