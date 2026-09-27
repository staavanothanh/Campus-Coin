import assert from 'node:assert/strict'
import { test } from 'node:test'
import { handleApiRequest } from '../src/api/handler.ts'
import { createCategorySuggestionService } from '../src/application/jev/category-suggestion-service.js'
import {
  seededStudentCategoryDefinitions,
  vietnameseStudentCategoryCases,
  vietnameseStudentCategoryCoverage,
} from './fixtures/vietnamese-student-category-cases.js'

const seededCategoryRows = [
  { id: 1, user_id: null, name_en: 'Salary', name_vi: 'Lương', applies_to: 'income', status: 'active', is_default: 1 },
  { id: 2, user_id: null, name_en: 'Allowance', name_vi: 'Trợ cấp', applies_to: 'income', status: 'active', is_default: 1 },
  { id: 3, user_id: null, name_en: 'Gift', name_vi: 'Quà tặng', applies_to: 'income', status: 'active', is_default: 1 },
  { id: 4, user_id: null, name_en: 'Other income', name_vi: 'Khác', applies_to: 'income', status: 'active', is_default: 1 },
  { id: 5, user_id: null, name_en: 'Food & Dining', name_vi: 'Ăn uống', applies_to: 'payment', status: 'active', is_default: 1 },
  { id: 6, user_id: null, name_en: 'Transport', name_vi: 'Di chuyển', applies_to: 'payment', status: 'active', is_default: 1 },
  { id: 7, user_id: null, name_en: 'Shopping', name_vi: 'Mua sắm', applies_to: 'payment', status: 'active', is_default: 1 },
  { id: 8, user_id: null, name_en: 'Entertainment', name_vi: 'Giải trí', applies_to: 'payment', status: 'active', is_default: 1 },
  { id: 9, user_id: null, name_en: 'Education', name_vi: 'Học tập', applies_to: 'payment', status: 'active', is_default: 1 },
  { id: 10, user_id: null, name_en: 'Rent & Utilities', name_vi: 'Nhà ở & Điện nước', applies_to: 'payment', status: 'active', is_default: 1 },
  { id: 11, user_id: null, name_en: 'Other payment', name_vi: 'Khác', applies_to: 'payment', status: 'active', is_default: 1 },
]

function responseData(response) {
  return response.json().then((body) => body.data)
}

function createScenario(example) {
  const state = {
    categoryQueries: 0,
    suggestionCalls: 0,
    suggestionInputs: [],
    adapterCalls: 0,
    adapterRequests: [],
    ledgerInserts: 0,
    insertedCategoryIds: [],
    walletReads: 0,
    beginTransactions: 0,
    commits: 0,
    rollbacks: 0,
    walletBalance: 5_000_000,
    ledgerRow: null,
  }

  const categoryForId = (id) => {
    const row = seededCategoryRows.find((candidate) => candidate.id === id)
    assert.ok(row, `missing synthetic seed category ${id}`)
    return row
  }

  const db = {
    beginTransaction: async () => { state.beginTransactions += 1 },
    commit: async () => { state.commits += 1 },
    rollback: async () => { state.rollbacks += 1 },
    query: async (sql, parameters = []) => {
      if (sql.includes('FROM categories WHERE (user_id IS NULL OR user_id = ?) AND applies_to = ?')) {
        state.categoryQueries += 1
        return [seededCategoryRows.filter(({ applies_to }) => applies_to === parameters[1]), []]
      }
      if (sql.includes('FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)') && sql.includes('FOR UPDATE')) {
        return [[categoryForId(Number(parameters[0]))], []]
      }
      if (sql.startsWith('SELECT id, request_hash, response_json FROM mutation_idempotency')) return [[], []]
      if (sql.startsWith('INSERT INTO mutation_idempotency')) return [{ insertId: 501 }, []]
      if (sql.includes('FROM wallet_accounts WHERE user_id = ? FOR UPDATE')) {
        state.walletReads += 1
        return [[{
          id: 1,
          user_id: 73,
          initialized: 1,
          initial_balance_vnd: 5_000_000,
          available_balance_vnd: state.walletBalance,
          currency: 'VND',
          updated_at: new Date('2026-09-25T00:00:00.000Z'),
        }], []]
      }
      if (sql.startsWith('INSERT INTO ledger_transactions')) {
        state.ledgerInserts += 1
        state.insertedCategoryIds.push(Number(parameters[3]))
        state.walletBalance += example.transactionType === 'income' ? example.amountVnd : -example.amountVnd
        state.ledgerRow = {
          id: 900,
          user_id: 73,
          type: parameters[1],
          amount_vnd: parameters[2],
          category_id: parameters[3],
          occurred_at: parameters[4],
          role: 'original',
          reference_id: null,
          description: parameters[7],
          reason: null,
          created_at: new Date('2026-09-25T10:00:00.000Z'),
        }
        return [{ insertId: 900 }, []]
      }
      if (sql.startsWith('INSERT INTO audit_events')) return [{ insertId: 901 }, []]
      if (sql.includes('FROM ledger_transactions WHERE id = ? AND user_id = ?')) return [[state.ledgerRow], []]
      if (sql.includes('FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?')) return [[], []]
      if (sql.includes('COALESCE(SUM(t.amount_vnd), 0) AS total')) return [[{ total: 0 }], []]
      if (sql.startsWith('UPDATE mutation_idempotency SET response_json')) return [{ affectedRows: 1 }, []]
      throw new Error(`unexpected synthetic flow query: ${sql}`)
    },
  }

  const adapter = {
    decide: async ({ questions, state: adapterState }) => {
      state.adapterCalls += 1
      state.adapterRequests.push({ questions, state: adapterState })
      if (example.mockProviderAnswer.kind === 'timeout') {
        throw Object.assign(new Error('synthetic timeout'), { code: 'provider_timeout' })
      }
      if (example.mockProviderAnswer.kind === 'quota') {
        throw Object.assign(new Error('synthetic quota'), { code: 'provider_http_error', status: 429 })
      }
      if (example.mockProviderAnswer.kind === 'schema') {
        return { answers: { category: { type: 'choice', choice: 'missing-confidence' } } }
      }
      const criteria = questions.category.criteria
      const choice = example.mockProviderAnswer.kind === 'abstain'
        ? 'other_or_uncertain'
        : Object.entries(criteria).find(([, label]) => label === example.targetCategoryLabel)?.[0]
      assert.ok(choice, `synthetic target label is not a route candidate for ${example.caseId}`)
      const ids = Object.keys(criteria)
      const probabilities = Object.fromEntries(ids.map((id) => [id, id === choice ? 0.9 : 0.1 / (ids.length - 1)]))
      return {
        answers: { category: { type: 'choice', choice, confidence: example.mockProviderAnswer.confidence, probabilities } },
        model: 'synthetic-typed-jev',
      }
    },
  }
  const baseJevService = createCategorySuggestionService({
    enabled: true,
    minimumConfidence: 0.8,
    maxCandidates: 20,
    adapter,
  })
  const jevService = {
    suggest: async (input) => {
      state.suggestionCalls += 1
      state.suggestionInputs.push(input)
      return baseJevService.suggest(input)
    },
  }

  return {
    state,
    deps: {
      db,
      allowedOrigins: new Set(['https://campus.example']),
      resolveSession: async () => ({ userId: 73, role: 'user' }),
      verifyCsrf: async () => true,
      jevService,
    },
  }
}

test('synthetic corpus has unique cases, bilingual rows, and ten clear examples per seeded category', () => {
  assert.equal(vietnameseStudentCategoryCases.length, 126)
  assert.equal(new Set(vietnameseStudentCategoryCases.map(({ caseId }) => caseId)).size, vietnameseStudentCategoryCases.length)
  assert.ok(vietnameseStudentCategoryCases.some(({ locale }) => locale === 'vi'))
  assert.ok(vietnameseStudentCategoryCases.some(({ locale }) => locale === 'en'))
  assert.ok(vietnameseStudentCategoryCases.some(({ tags }) => tags.linguistic === 'vi_unaccented'))
  assert.ok(vietnameseStudentCategoryCases.some(({ tags }) => tags.linguistic === 'typo_teencode'))
  assert.ok(vietnameseStudentCategoryCases.some(({ tags }) => tags.linguistic === 'loanword_mixed'))
  for (const [categoryId, definition] of Object.entries(seededStudentCategoryDefinitions)) {
    const clearCases = vietnameseStudentCategoryCases.filter((example) => example.targetCategoryId === Number(categoryId)
      && example.expectedSuggestion.status === 'suggested')
    assert.ok(clearCases.length >= 10, `category ${categoryId}: ${definition.en}`)
    assert.ok(clearCases.some(({ locale }) => locale === 'vi'), `category ${categoryId} lacks Vietnamese examples`)
    assert.ok(clearCases.some(({ locale }) => locale === 'en'), `category ${categoryId} lacks English examples`)
    assert.equal(vietnameseStudentCategoryCoverage[categoryId], clearCases.length)
  }
  assert.ok(vietnameseStudentCategoryCases.some(({ mockProviderAnswer }) => mockProviderAnswer.kind === 'abstain'))
  assert.ok(vietnameseStudentCategoryCases.some(({ mockProviderAnswer }) => mockProviderAnswer.kind === 'schema'))
  assert.ok(vietnameseStudentCategoryCases.some(({ mockProviderAnswer }) => mockProviderAnswer.kind === 'timeout'))
  assert.ok(vietnameseStudentCategoryCases.some(({ mockProviderAnswer }) => mockProviderAnswer.kind === 'quota'))
  assert.ok(vietnameseStudentCategoryCases.some(({ mockProviderAnswer, description }) => mockProviderAnswer.kind === 'privacy' && description.includes('Bearer')))
  assert.ok(vietnameseStudentCategoryCases.some(({ sensitiveMarkers }) => sensitiveMarkers.length > 0))
  assert.ok(vietnameseStudentCategoryCases.some(({ decision }) => decision === 'override'))
  assert.ok(vietnameseStudentCategoryCases.some(({ tags }) => tags.intent === 'prompt_injection_probe'))
  assert.ok(vietnameseStudentCategoryCases.some(({ decision }) => decision === 'manual_pick'))
})

test('synthetic student corpus routes typed suggestions, then submits a separate explicit choice to the ledger', async () => {
  for (const example of vietnameseStudentCategoryCases) {
    const { state, deps } = createScenario(example)
    const suggestionResponse = await handleApiRequest(new Request('https://campus.example/ai/category-suggestion', {
      method: 'POST',
      headers: { origin: 'https://campus.example', 'content-type': 'application/json' },
      body: JSON.stringify({ transactionType: example.transactionType, description: example.description, locale: example.locale }),
    }), deps)
    const suggestion = await responseData(suggestionResponse)

    assert.equal(suggestionResponse.status, 200, example.caseId)
    assert.deepEqual({
      status: suggestion.status,
      categoryId: suggestion.categoryId === null ? null : Number(suggestion.categoryId),
      confidence: suggestion.confidence,
      reasonCode: suggestion.reasonCode ?? null,
    }, example.expectedSuggestion, example.caseId)
    const returnedCategoryId = suggestion.categoryId === null ? null : Number(suggestion.categoryId)
    assert.equal(returnedCategoryId, example.expectedSuggestion.status === 'suggested' ? example.expectedSuggestion.categoryId : null, example.caseId)
    assert.equal(state.categoryQueries, example.mockProviderAnswer.kind === 'privacy' ? 0 : 1, example.caseId)
    assert.equal(state.ledgerInserts, 0, example.caseId)
    assert.equal(state.suggestionCalls, example.mockProviderAnswer.kind === 'privacy' && example.description.includes('Bearer') ? 0 : 1, example.caseId)
    if (state.suggestionInputs.length > 0) {
      const expectedDescription = example.sensitiveMarkers.length === 0
        ? example.description
        : example.description.replace(' +84 912 345 678', ' +[REDACTED]').replace('teacher@campus.edu.vn', '[REDACTED]')
      assert.equal(state.suggestionInputs[0].descriptionRedacted, expectedDescription, example.caseId)
    }
    assert.equal(state.adapterCalls, example.mockProviderAnswer.kind === 'privacy' ? 0 : 1, example.caseId)
    if (example.mockProviderAnswer.kind === 'match') {
      assert.equal(state.adapterRequests.length, 1, example.caseId)
      assert.equal(state.adapterRequests[0].state.contractVersion, 'jev-category-v1', example.caseId)
      assert.equal(Object.hasOwn(state.adapterRequests[0].state, 'amountVnd'), false, example.caseId)
      const outboundDescription = state.adapterRequests[0].state.description
      if (example.sensitiveMarkers.length === 0) assert.equal(outboundDescription, example.description, example.caseId)
      else {
        assert.ok(outboundDescription.includes('[REDACTED]'), example.caseId)
        assert.ok(outboundDescription.length < example.description.length, example.caseId)
      }
      for (const marker of example.sensitiveMarkers) assert.equal(outboundDescription.includes(marker), false, example.caseId)
    }

    const submittedCategoryId = example.decision === 'confirm' && returnedCategoryId !== null
      ? returnedCategoryId
      : example.submittedCategoryId
    const saveResponse = await handleApiRequest(new Request('https://campus.example/ledger/transactions', {
      method: 'POST',
      headers: {
        origin: 'https://campus.example',
        'content-type': 'application/json',
        'idempotency-key': `synthetic-${example.caseId}`,
      },
      body: JSON.stringify({
        type: example.transactionType,
        amountVnd: example.amountVnd,
        categoryId: String(submittedCategoryId),
        occurredAt: '2026-09-25T10:00:00.000Z',
        description: example.description,
        confirmedCategorySuggestion: example.decision === 'confirm' && returnedCategoryId !== null,
      }),
    }), deps)
    const saveBody = await saveResponse.json()
    const saved = saveBody.data

    assert.equal(saveResponse.status, 201, `${example.caseId}: ${JSON.stringify(saveBody)}`)
    assert.equal(saved.transaction.categoryId, String(submittedCategoryId), example.caseId)
    assert.equal(saved.transaction.description, example.description, example.caseId)
    assert.equal(state.insertedCategoryIds.at(-1), submittedCategoryId, example.caseId)
    assert.equal(state.beginTransactions, 1, example.caseId)
    assert.equal(state.commits, 1, example.caseId)
    assert.equal(state.rollbacks, 0, example.caseId)
    assert.equal(state.suggestionCalls, example.mockProviderAnswer.kind === 'privacy' && example.description.includes('Bearer') ? 0 : 1, example.caseId)
    if (example.decision === 'confirm') {
      assert.equal(returnedCategoryId, example.submittedCategoryId, example.caseId)
      assert.equal(saved.transaction.categoryId, suggestion.categoryId, example.caseId)
    } else {
      assert.equal(saved.transaction.categoryId, String(example.submittedCategoryId), example.caseId)
      assert.notEqual(saved.transaction.categoryId, suggestion.categoryId, example.caseId)
    }
  }
})
test('service rejection still permits a separate manual category save', async () => {
  const example = vietnameseStudentCategoryCases.find(({ decision }) => decision === 'manual_pick')
  assert.ok(example)
  const { state, deps } = createScenario(example)
  deps.jevService.suggest = async () => { throw new Error('synthetic service rejection') }
  const suggestionResponse = await handleApiRequest(new Request('https://campus.example/ai/category-suggestion', {
    method: 'POST',
    headers: { origin: 'https://campus.example', 'content-type': 'application/json' },
    body: JSON.stringify({ transactionType: example.transactionType, description: example.description, locale: example.locale }),
  }), deps)
  assert.equal(suggestionResponse.status, 200)
  assert.deepEqual(await responseData(suggestionResponse), {
    status: 'manual', categoryId: null, confidence: null, reasonCode: null,
  })
  assert.equal(state.ledgerInserts, 0)

  const saveResponse = await handleApiRequest(new Request('https://campus.example/ledger/transactions', {
    method: 'POST',
    headers: {
      origin: 'https://campus.example',
      'content-type': 'application/json',
      'idempotency-key': `manual-fallback-${example.caseId}`,
    },
    body: JSON.stringify({
      type: example.transactionType,
      amountVnd: example.amountVnd,
      categoryId: String(example.submittedCategoryId),
      occurredAt: '2026-09-25T10:00:00.000Z',
      description: example.description,
    }),
  }), deps)
  const saveBody = await saveResponse.json()
  assert.equal(saveResponse.status, 201)
  assert.equal(saveBody.data.transaction.categoryId, String(example.submittedCategoryId))
  assert.equal(state.ledgerInserts, 1)
  assert.deepEqual(state.insertedCategoryIds, [example.submittedCategoryId])
})
