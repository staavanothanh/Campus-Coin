import { loadAiProviderConfig } from '../../config/ai-provider-config.js'
import { createOpenRouterJevAdapter } from '../../infrastructure/providers/openrouter-jev.js'
import { redactJevDescription } from '../../lib/jev-description.js'

const CATEGORY_QUESTION_ID = 'category'
const OTHER_OR_UNCERTAIN_ID = 'other_or_uncertain'
const CONTRACT_VERSION = 'jev-category-v1'
const MAX_DESCRIPTION_LENGTH = 500
const MAX_CATEGORY_ID_LENGTH = 64
const MAX_SEMANTIC_LABEL_LENGTH = 120
const VALID_TRANSACTION_TYPES = new Set(['income', 'payment'])
const VALID_LOCALES = new Set(['en', 'vi'])

function createResult(status, categoryId = null, confidence = null, reasonCode = null) {
  return Object.freeze({ status, categoryId, confidence, reasonCode })
}


function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isValidPolicy(minimumConfidence, maxCandidates) {
  return Number.isFinite(minimumConfidence)
    && minimumConfidence >= 0
    && minimumConfidence <= 1
    && Number.isInteger(maxCandidates)
    && maxCandidates > 0
    && maxCandidates <= 254
}

function isValidCategoryId(value) {
  return typeof value === 'string'
    && value.length <= MAX_CATEGORY_ID_LENGTH
    && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)
}

function isValidInput(input) {
  if (!isRecord(input)) return false
  const { transactionType, descriptionRedacted, locale, candidates } = input
  return VALID_TRANSACTION_TYPES.has(transactionType)
    && typeof descriptionRedacted === 'string'
    && descriptionRedacted.trim().length > 0
    && descriptionRedacted.length <= MAX_DESCRIPTION_LENGTH
    && VALID_LOCALES.has(locale)
    && Array.isArray(candidates)
}

function isValidCandidate(candidate) {
  return candidate !== null
    && typeof candidate === 'object'
    && !Array.isArray(candidate)
    && isValidCategoryId(candidate.id)
    && candidate.id !== OTHER_OR_UNCERTAIN_ID
    && typeof candidate.semanticLabel === 'string'
    && candidate.semanticLabel.trim().length > 0
    && candidate.semanticLabel.length <= MAX_SEMANTIC_LABEL_LENGTH
    && candidate.active === true
    && Array.isArray(candidate.appliesTo)
}

function selectEligibleCandidates(candidates, transactionType) {
  const eligible = candidates.filter((candidate) => candidate?.active === true
    && Array.isArray(candidate.appliesTo)
    && candidate.appliesTo.includes(transactionType))
  if (eligible.some((candidate) => !isValidCandidate(candidate))) return null
  if (new Set(eligible.map((candidate) => candidate.id)).size !== eligible.length) return null
  return eligible
}

function createCriteria(candidates) {
  const criteria = Object.fromEntries(candidates.map(({ id, semanticLabel }) => [id, semanticLabel]))
  return {
    ...criteria,
    [OTHER_OR_UNCERTAIN_ID]: 'No candidate fits or the choice is uncertain.',
  }
}

function isValidProbabilityMap(probabilities, criteria) {
  if (probabilities === undefined) return true
  if (probabilities === null || typeof probabilities !== 'object' || Array.isArray(probabilities)) return false
  const candidateIds = Object.keys(criteria)
  const probabilityIds = Object.keys(probabilities)
  if (probabilityIds.length !== candidateIds.length) return false

  let sum = 0
  for (const id of probabilityIds) {
    const probability = probabilities[id]
    if (!Object.hasOwn(criteria, id) || !Number.isFinite(probability) || probability < 0 || probability > 1) return false
    sum += probability
  }
  return Math.abs(sum - 1) <= 0.01
}

function mapProviderError(error) {
  if (error?.code === 'provider_timeout') return createResult('manual', null, null, 'timeout')
  if (error?.code === 'provider_http_error' && [402, 429].includes(error.status)) {
    return createResult('manual', null, null, 'quota')
  }
  if (error?.code === 'invalid_provider_response') return createResult('manual', null, null, 'schema')
  return createResult('unavailable')
}

function mapAnswer(payload, candidates, criteria, minimumConfidence) {
  const answer = payload?.answers?.[CATEGORY_QUESTION_ID]
  if (answer?.type !== 'choice'
    || typeof answer.choice !== 'string'
    || !isValidProbabilityMap(answer.probabilities, criteria)) {
    return createResult('manual', null, null, 'schema')
  }

  if (answer.choice !== OTHER_OR_UNCERTAIN_ID && !candidates.some((candidate) => candidate.id === answer.choice)) {
    return createResult('manual', null, null, 'schema')
  }
  if (!Number.isFinite(answer.confidence) || answer.confidence < 0 || answer.confidence > 1) {
    return createResult('manual', null, null, 'schema')
  }
  if (answer.probabilities !== undefined) {
    const maximum = Math.max(...Object.values(answer.probabilities))
    if (answer.probabilities[answer.choice] < maximum - 0.01) {
      return createResult('manual', null, null, 'schema')
    }
  }
  if (answer.choice === OTHER_OR_UNCERTAIN_ID || answer.confidence < minimumConfidence) {
    return createResult('manual', null, answer.confidence, 'low_confidence')
  }
  return createResult('suggested', answer.choice, answer.confidence)
}

/**
 * Creates a bounded JEV category suggestion service. It never mutates money
 * state; callers must keep it outside transaction creation and expose Save
 * independently of this optional call.
 */
export function createCategorySuggestionService({
  enabled = false,
  minimumConfidence = null,
  maxCandidates = null,
  adapter,
} = {}) {
  return Object.freeze({
    suggest: async (input = {}) => {
      if (enabled !== true) return createResult('disabled', null, null, 'flag_off')
      if (!isValidPolicy(minimumConfidence, maxCandidates)) return createResult('disabled')
      if (typeof adapter?.decide !== 'function') return createResult('disabled')
      if (!isValidInput(input)) return createResult('manual', null, null, 'schema')

      const candidates = selectEligibleCandidates(input.candidates, input.transactionType)
      if (!candidates || candidates.length === 0 || candidates.length + 1 > maxCandidates) {
        return createResult('manual', null, null, 'schema')
      }

      const description = redactJevDescription(input.descriptionRedacted)
      if (description === null) return createResult('manual', null, null, 'privacy')

      const criteria = createCriteria(candidates)
      try {
        const response = await adapter.decide({
          state: {
            transactionType: input.transactionType,
            description,
            locale: input.locale,
            contractVersion: CONTRACT_VERSION,
          },
          questions: {
            [CATEGORY_QUESTION_ID]: {
              type: 'choice',
              instructions: 'Choose the matching candidate category.',
              criteria,
            },
          },
        })
        return mapAnswer(response, candidates, criteria, minimumConfidence)
      } catch (error) {
        return mapProviderError(error)
      }
    },
  })
}

/** Builds a server-only suggestion service. It remains disabled unless explicitly enabled. */
export function createCategorySuggestionServiceFromEnvironment({
  env = process.env,
  loadEnvFile,
  fetchImpl,
  logger,
} = {}) {
  const loadOptions = loadEnvFile === undefined ? { env } : { env, loadEnvFile }
  const config = loadAiProviderConfig(loadOptions)
  const hasPolicy = isValidPolicy(config.jev.minimumConfidence, config.jev.maxCandidates)
  const apiKey = config.jev.apiKey
  const explicitlyEnabled = config.jev.enabled
  const adapter = explicitlyEnabled && hasPolicy
    ? createOpenRouterJevAdapter({ apiKey, fetchImpl, logger })
    : undefined

  return createCategorySuggestionService({
    enabled: explicitlyEnabled,
    minimumConfidence: config.jev.minimumConfidence,
    maxCandidates: config.jev.maxCandidates,
    adapter,
  })
}
