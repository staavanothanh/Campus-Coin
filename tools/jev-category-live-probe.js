import { createCategorySuggestionService } from '../src/application/jev/category-suggestion-service.js'
import { loadAiProviderConfig } from '../src/config/ai-provider-config.js'
import { createOpenRouterJevAdapter } from '../src/infrastructure/providers/openrouter-jev.js'

const REQUIRED_APPROVAL = 'I_APPROVE_ONE_LIVE_JEV_PROBE'
const MINIMUM_PROBE_CANDIDATES = 3
const PROBE_INPUT = Object.freeze({
  transactionType: 'income',
  descriptionRedacted: 'Synthetic campus cafe shift salary',
  locale: 'en',
  candidates: Object.freeze([
    Object.freeze({ id: 'salary', semanticLabel: 'Salary', active: true, appliesTo: Object.freeze(['income']) }),
    Object.freeze({ id: 'allowance', semanticLabel: 'Allowance', active: true, appliesTo: Object.freeze(['income']) }),
  ]),
})
const NOOP_LOGGER = Object.freeze({ warn() {} })

function gateFailure(code, message) {
  return Object.assign(new Error(message), { code })
}

function readApprovedConfiguration(env) {
  if (env.JEV_LIVE_PROBE_APPROVED !== REQUIRED_APPROVAL) {
    throw gateFailure('jev_live_probe_not_approved', 'Live JEV probe requires explicit approval.')
  }

  const hasExplicitConfidence = typeof env.JEV_MINIMUM_CONFIDENCE === 'string' && env.JEV_MINIMUM_CONFIDENCE.trim() !== ''
  const hasExplicitCandidateBound = typeof env.JEV_MAX_CANDIDATES === 'string' && env.JEV_MAX_CANDIDATES.trim() !== ''
  if (!hasExplicitConfidence || !hasExplicitCandidateBound) {
    throw gateFailure('jev_live_probe_configuration_invalid', 'Live JEV probe configuration is incomplete or invalid.')
  }

  let config
  try {
    config = loadAiProviderConfig({ env, loadEnvFile() {} })
  } catch {
    throw gateFailure('jev_live_probe_configuration_invalid', 'Live JEV probe configuration is incomplete or invalid.')
  }

  if (!config.jev.enabled
    || typeof config.jev.apiKey !== 'string'
    || config.jev.apiKey.trim() === ''
    || !Number.isFinite(config.jev.minimumConfidence)
    || !Number.isInteger(config.jev.maxCandidates)
    || config.jev.maxCandidates < MINIMUM_PROBE_CANDIDATES) {
    throw gateFailure('jev_live_probe_configuration_invalid', 'Live JEV probe configuration is incomplete or invalid.')
  }
  return config.jev
}

/** Makes one explicitly approved probe using only a fixed synthetic description. */
export async function runLiveProbe({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const jevConfig = readApprovedConfiguration(env)
  if (typeof fetchImpl !== 'function') {
    throw gateFailure('jev_live_probe_configuration_invalid', 'Live JEV probe configuration is incomplete or invalid.')
  }

  let adapter
  try {
    const noRedirectFetch = (url, options) => fetchImpl(url, { ...options, redirect: 'error' })
    adapter = createOpenRouterJevAdapter({ apiKey: jevConfig.apiKey, fetchImpl: noRedirectFetch, logger: NOOP_LOGGER })
  } catch {
    throw gateFailure('jev_live_probe_configuration_invalid', 'Live JEV probe configuration is incomplete or invalid.')
  }

  const service = createCategorySuggestionService({
    enabled: true,
    minimumConfidence: jevConfig.minimumConfidence,
    maxCandidates: jevConfig.maxCandidates,
    adapter,
  })
  const result = await service.suggest(PROBE_INPUT)
  return Object.freeze({
    status: result.status,
    confidence: result.confidence,
    reasonCode: result.reasonCode,
  })
}
