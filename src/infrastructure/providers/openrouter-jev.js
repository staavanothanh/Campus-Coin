import { redactJevDescription } from '../../lib/jev-description.js'

const OPENROUTER_SYSTEM_ONE_ENDPOINT = 'https://openrouter.ai/api/v1/systemone'
const OPENROUTER_JEV_MODEL = 'typesafe/jev-1.13'
const DEFAULT_TIMEOUT_MS = 10_000
const MAX_CHOICES = 255
const MAX_REQUEST_BYTES = 65_536
const MAX_RESPONSE_BYTES = 65_536
const PROBABILITY_SUM_TOLERANCE = 0.01
const ALLOWED_STATE_FIELDS = new Set(['transactionType', 'description', 'locale', 'contractVersion'])
const ALLOWED_QUESTION_FIELDS = new Set(['category'])
const ALLOWED_QUESTION_PROPERTIES = new Set(['type', 'instructions', 'criteria'])
const ALLOWED_TRANSACTION_TYPES = new Set(['income', 'payment'])
const ALLOWED_LOCALES = new Set(['en', 'vi'])
const OTHER_OR_UNCERTAIN_ID = 'other_or_uncertain'

class OpenRouterJevError extends Error {
  constructor(code, message, status) {
    super(message)
    this.name = 'OpenRouterJevError'
    this.code = code
    if (Number.isInteger(status)) this.status = status
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function createError(code, message, status) {
  return new OpenRouterJevError(code, message, status)
}

function logMetadata(logger, level, metadata) {
  const log = logger?.[level]
  if (typeof log !== 'function') return
  try {
    log.call(logger, metadata)
  } catch {
    // Provider failure handling must not depend on logging.
  }
}

function validateConfiguration({ apiKey, fetchImpl, timeoutMs }) {
  if (typeof apiKey !== 'string' || apiKey.trim() === ''
    || typeof fetchImpl !== 'function'
    || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw createError('provider_configuration_error', 'OpenRouter configuration is invalid')
  }
}

function validateRequest({ state, questions }) {
  if (!isRecord(state)
    || Object.keys(state).some((field) => !ALLOWED_STATE_FIELDS.has(field))
    || Object.keys(state).length !== ALLOWED_STATE_FIELDS.size
    || !ALLOWED_TRANSACTION_TYPES.has(state.transactionType)
    || typeof state.description !== 'string'
    || state.description.length === 0
    || state.description.length > 500
    || redactJevDescription(state.description) !== state.description
    || !ALLOWED_LOCALES.has(state.locale)
    || state.contractVersion !== 'jev-category-v1'
    || !isRecord(questions)
    || Object.keys(questions).length !== 1
    || Object.keys(questions).some((questionId) => !ALLOWED_QUESTION_FIELDS.has(questionId))) {
    throw createError('invalid_provider_request', 'OpenRouter request is invalid')
  }

  const question = questions.category
  if (!isRecord(question)
    || Object.keys(question).some((field) => !ALLOWED_QUESTION_PROPERTIES.has(field))
    || Object.keys(question).length !== ALLOWED_QUESTION_PROPERTIES.size
    || question.type !== 'choice'
    || question.instructions !== 'Choose the matching candidate category.'
    || !isRecord(question.criteria)) {
    throw createError('invalid_provider_request', 'OpenRouter request is invalid')
  }

  const criteria = question.criteria
  const candidateIds = Object.keys(criteria)
  if (candidateIds.length < 2
    || candidateIds.length > MAX_CHOICES
    || !Object.hasOwn(criteria, OTHER_OR_UNCERTAIN_ID)
    || criteria[OTHER_OR_UNCERTAIN_ID] !== 'No candidate fits or the choice is uncertain.') {
    throw createError('invalid_provider_request', 'OpenRouter request is invalid')
  }

  for (const [candidateId, label] of Object.entries(criteria)) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(candidateId)
      || typeof label !== 'string'
      || label.trim().length === 0
      || label.length > 120
      || (candidateId !== OTHER_OR_UNCERTAIN_ID && (/\d|@|bearer|cookie|account|token|secret/i.test(label) || redactJevDescription(label) !== label))) {
      throw createError('invalid_provider_request', 'OpenRouter request is invalid')
    }
  }
}

function isJevModel(model) {
  return model === OPENROUTER_JEV_MODEL || model.startsWith(`${OPENROUTER_JEV_MODEL}-`)
}

function validateUsage(usage) {
  if (usage === undefined) return true
  if (!isRecord(usage)) return false
  for (const tokenField of ['input_tokens', 'output_tokens']) {
    if (Object.hasOwn(usage, tokenField)
      && (!Number.isInteger(usage[tokenField]) || usage[tokenField] < 0)) return false
  }
  if (Object.hasOwn(usage, 'cost')
    && (typeof usage.cost !== 'number' || !Number.isFinite(usage.cost) || usage.cost < 0)) return false
  return true
}

function validateChoiceAnswer(answer, question) {
  if (!isRecord(answer) || answer.type !== 'choice' || typeof answer.choice !== 'string') return false
  const candidateIds = Object.keys(question.criteria)
  const candidateSet = new Set(candidateIds)
  if (!candidateSet.has(answer.choice)) return false

  if (answer.probabilities !== undefined) {
    if (!isRecord(answer.probabilities)) return false
    const probabilityIds = Object.keys(answer.probabilities)
    if (probabilityIds.length !== candidateIds.length || probabilityIds.some((id) => !candidateSet.has(id))) {
      return false
    }

    let sum = 0
    let maximum = -Infinity
    for (const id of candidateIds) {
      const probability = answer.probabilities[id]
      if (typeof probability !== 'number' || !Number.isFinite(probability) || probability < 0 || probability > 1) {
        return false
      }
      sum += probability
      maximum = Math.max(maximum, probability)
    }
    if (Math.abs(sum - 1) > PROBABILITY_SUM_TOLERANCE
      || answer.probabilities[answer.choice] < maximum - PROBABILITY_SUM_TOLERANCE) return false
  }

  if (answer.confidence === undefined) return true
  return typeof answer.confidence === 'number'
    && Number.isFinite(answer.confidence)
    && answer.confidence >= 0
    && answer.confidence <= 1
}

function validateResponse(payload, questions) {
  if (!isRecord(payload)
    || typeof payload.model !== 'string'
    || !isJevModel(payload.model)
    || !isRecord(payload.answers)
    || !validateUsage(payload.usage)) return false

  for (const field of ['id', 'provider']) {
    if (Object.hasOwn(payload, field) && typeof payload[field] !== 'string') return false
  }

  const expectedIds = Object.keys(questions)
  const answerIds = Object.keys(payload.answers)
  if (answerIds.length !== expectedIds.length || answerIds.some((id) => !Object.hasOwn(questions, id))) {
    return false
  }
  return expectedIds.every((id) => validateChoiceAnswer(payload.answers[id], questions[id]))
}

async function readProviderResponse(response) {
  if (!response || typeof response.json !== 'function') {
    throw createError('invalid_provider_response', 'OpenRouter returned an invalid response')
  }
  const length = response.headers?.get?.('content-length')
  if (/^\d+$/.test(length ?? '') && Number(length) > MAX_RESPONSE_BYTES) {
    throw createError('invalid_provider_response', 'OpenRouter returned an invalid response')
  }

  if (typeof response.body?.getReader === 'function') {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const chunks = []
    let totalBytes = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        totalBytes += value.byteLength
        if (totalBytes > MAX_RESPONSE_BYTES) {
          await reader.cancel()
          throw createError('invalid_provider_response', 'OpenRouter returned an invalid response')
        }
        chunks.push(decoder.decode(value, { stream: true }))
      }
      chunks.push(decoder.decode())
      return JSON.parse(chunks.join(''))
    } catch (error) {
      if (error?.code === 'invalid_provider_response') throw error
      throw createError('invalid_provider_response', 'OpenRouter returned an invalid response')
    }
  }

  try {
    const payload = await response.json()
    const serialized = JSON.stringify(payload)
    if (typeof serialized !== 'string' || new TextEncoder().encode(serialized).byteLength > MAX_RESPONSE_BYTES) {
      throw createError('invalid_provider_response', 'OpenRouter returned an invalid response')
    }
    return payload
  } catch (error) {
    if (error?.code === 'invalid_provider_response') throw error
    throw createError('invalid_provider_response', 'OpenRouter returned an invalid response')
  }
}

/** Creates the server-only typed System One adapter. */
export function createOpenRouterJevAdapter({
  apiKey,
  fetchImpl = globalThis.fetch,
  logger = console,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  validateConfiguration({ apiKey, fetchImpl, timeoutMs })
  return Object.freeze({
    decide: async ({ state, questions } = {}) => {
      validateRequest({ state, questions })
      let body
      try {
        body = JSON.stringify({ model: OPENROUTER_JEV_MODEL, state, questions })
      } catch {
        throw createError('invalid_provider_request', 'OpenRouter request is invalid')
      }
      if (typeof body !== 'string' || new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
        throw createError('invalid_provider_request', 'OpenRouter request is invalid')
      }

      const controller = new AbortController()
      let timedOut = false
      let timeout
      const timeoutPromise = new Promise((_resolve, reject) => {
        timeout = setTimeout(() => {
          timedOut = true
          controller.abort()
          reject(createError('provider_timeout', 'OpenRouter request timed out'))
        }, timeoutMs)
      })
      const request = (async () => {
        let response
        try {
          response = await fetchImpl(OPENROUTER_SYSTEM_ONE_ENDPOINT, {
            method: 'POST',
            redirect: 'error',
            headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
            body,
            signal: controller.signal,
          })
        } catch (error) {
          if (error?.name === 'AbortError') throw createError('provider_timeout', 'OpenRouter request timed out')
          throw createError('provider_network_error', 'OpenRouter request failed')
        }
        const status = response?.status
        if (!Number.isInteger(status) || status < 200 || status >= 300) {
          throw createError('provider_http_error', 'OpenRouter returned an HTTP error', status)
        }
        const payload = await readProviderResponse(response)
        if (!validateResponse(payload, questions)) {
          throw createError('invalid_provider_response', 'OpenRouter returned an invalid response')
        }
        return payload
      })()

      try {
        return await Promise.race([request, timeoutPromise])
      } catch (error) {
        if (error?.code === 'provider_timeout' || timedOut) {
          logMetadata(logger, 'warn', { event: 'openrouter_timeout' })
          throw createError('provider_timeout', 'OpenRouter request timed out')
        }
        if (error?.code === 'provider_http_error') {
          logMetadata(logger, 'warn', { event: 'openrouter_http_error', status: error.status })
          throw error
        }
        if (error?.code === 'invalid_provider_response') {
          logMetadata(logger, 'warn', { event: 'openrouter_invalid_response' })
          throw error
        }
        if (error?.code === 'invalid_provider_request') throw error
        logMetadata(logger, 'warn', { event: 'openrouter_network_error' })
        throw createError('provider_network_error', 'OpenRouter request failed')
      } finally {
        clearTimeout(timeout)
      }
    },
  })
}
