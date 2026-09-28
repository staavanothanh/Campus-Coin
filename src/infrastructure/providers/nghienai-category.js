import { createNghienAiChatAdapter, DEFAULT_BASE_URL, DEFAULT_MODEL } from './nghienai-chat.js'

const OTHER_OR_UNCERTAIN_ID = 'other_or_uncertain'
const CATEGORY_QUESTION_ID = 'category'
const CONTRACT_VERSION = 'jev-category-v1'
const MAX_DESCRIPTION_LENGTH = 500
const MAX_CANDIDATE_ID_LENGTH = 64
const MAX_LABEL_LENGTH = 120
const VALID_TRANSACTION_TYPES = new Set(['income', 'payment'])
const VALID_LOCALES = new Set(['en', 'vi'])

class NghienAiCategoryError extends Error {
  constructor(code, status) {
    super(code)
    this.name = 'NghienAiCategoryError'
    this.code = code
    if (status !== undefined) this.status = status
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function invalidRequest() {
  return new NghienAiCategoryError('invalid_provider_request')
}

function invalidResponse() {
  return new NghienAiCategoryError('invalid_provider_response')
}

/**
 * Strictly validates the decision request before it reaches the chat provider.
 * Mirrors the JEV adapter's contract boundary so the shared application service
 * can use either provider without weakening validation.
 */
function validateDecisionRequest({ state, questions }) {
  if (!isRecord(state)
    || !VALID_TRANSACTION_TYPES.has(state.transactionType)
    || typeof state.description !== 'string'
    || state.description.length === 0
    || state.description.length > MAX_DESCRIPTION_LENGTH
    || !VALID_LOCALES.has(state.locale)
    || state.contractVersion !== CONTRACT_VERSION) {
    throw invalidRequest()
  }

  if (!isRecord(questions)
    || Object.keys(questions).length !== 1
    || !Object.hasOwn(questions, CATEGORY_QUESTION_ID)) {
    throw invalidRequest()
  }

  const question = questions[CATEGORY_QUESTION_ID]
  if (!isRecord(question)
    || question.type !== 'choice'
    || !isRecord(question.criteria)) {
    throw invalidRequest()
  }

  const criteria = question.criteria
  const candidateIds = Object.keys(criteria)
  if (candidateIds.length < 2
    || !Object.hasOwn(criteria, OTHER_OR_UNCERTAIN_ID)) {
    throw invalidRequest()
  }

  for (const [candidateId, label] of Object.entries(criteria)) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(candidateId)
      || candidateId.length > MAX_CANDIDATE_ID_LENGTH
      || typeof label !== 'string'
      || label.trim().length === 0
      || label.length > MAX_LABEL_LENGTH) {
      throw invalidRequest()
    }
  }
}

/** Builds a deterministic, bounded prompt asking the model for JSON only. */
function buildMessages({ state, criteria }) {
  const candidateLines = Object.entries(criteria)
    .map(([id, label]) => `- ${id}: ${label}`)
    .join('\n')

  return [
    {
      role: 'system',
      content:
        'You are a transaction categorization assistant. Given a transaction description ' +
        'and a fixed list of candidate categories, choose the single best matching category. ' +
        'Respond with JSON only and nothing else, exactly in this shape: ' +
        '{"category":"<candidate id>","confidence":<number from 0 to 1>}. ' +
        'The category value must be exactly one of the candidate ids below. ' +
        'If no candidate fits or the choice is uncertain, use the id ' +
        `"${OTHER_OR_UNCERTAIN_ID}".`,
    },
    {
      role: 'user',
      content:
        `Transaction type: ${state.transactionType}\n` +
        `Locale: ${state.locale}\n` +
        `Description: ${state.description}\n` +
        'Candidates:\n' +
        candidateLines,
    },
  ]
}

/** Extracts the first JSON object from a chat completion string, if any. */
function extractJsonObject(content) {
  if (typeof content !== 'string') return null
  let text = content.trim()
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fence) text = fence[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const parsed = JSON.parse(text.slice(start, end + 1))
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Maps a parsed chat payload into the shared `decide` result shape. */
function mapCompletion(payload, criteria) {
  const content = payload?.choices?.[0]?.message?.content
  const parsed = extractJsonObject(content)
  if (parsed === null) throw invalidResponse()

  const choice = parsed.category
  const confidence = parsed.confidence
  if (typeof choice !== 'string' || !Object.hasOwn(criteria, choice)) throw invalidResponse()
  if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw invalidResponse()
  }

  return {
    model: payload.model,
    answers: {
      [CATEGORY_QUESTION_ID]: {
        type: 'choice',
        choice,
        confidence,
      },
    },
  }
}

/**
 * Creates a server-only NghienAI adapter that conforms to the same
 * `decide({ state, questions })` contract as the JEV adapter, so the shared
 * category-suggestion service can use either provider interchangeably.
 *
 * NghienAI is a generative chat LLM (provisional, OpenAI-compatible transport).
 * It never computes money state and its answer is validated against the exact
 * candidate set before anything crosses back to the application layer.
 *
 * @param {object} options
 * @param {string} options.apiKey - Provider credential; never logged or returned.
 * @param {string} [options.baseUrl]
 * @param {string} [options.model]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {object} [options.logger]
 * @param {number} [options.timeoutMs]
 * @returns {{decide: (input: {state: unknown, questions: unknown}) => Promise<object>}}
 */
export function createNghienAiCategoryAdapter({
  apiKey,
  baseUrl = DEFAULT_BASE_URL,
  model = DEFAULT_MODEL,
  fetchImpl = globalThis.fetch,
  logger = console,
  timeoutMs = 15_000,
} = {}) {
  const chat = createNghienAiChatAdapter({ apiKey, baseUrl, model, fetchImpl, logger, timeoutMs })

  return Object.freeze({
    decide: async ({ state, questions } = {}) => {
      validateDecisionRequest({ state, questions })
      const criteria = questions[CATEGORY_QUESTION_ID].criteria
      const messages = buildMessages({ state, criteria })
      const payload = await chat.complete({ messages })
      return mapCompletion(payload, criteria)
    },
  })
}
