import dotenv from 'dotenv'

const DEFAULT_NGHIENAI_BASE_URL = 'https://api.aixingialaire.shop/v1'
const NGHIENAI_MODEL = 'gpt-6-luna'

function defaultLoader() {
  const result = dotenv.config({ quiet: true, override: false })
  if (result.error && result.error.code !== 'ENOENT') throw result.error
  if (result.parsed !== undefined) mergeMissingEnvironment(process.env, result.parsed)
}

export function mergeMissingEnvironment(env, fileEnv) {
  for (const [name, value] of Object.entries(fileEnv)) {
    if (env[name] === undefined || env[name] === '') env[name] = value
  }
}

function createConfigurationError() {
  return Object.assign(new Error('Provider configuration is invalid'), {
    code: 'provider_configuration_error',
  })
}

function readFeatureFlag(env, name) {
  const value = env[name]
  if (value === undefined) return false
  if (value === 'false') return false
  if (value === 'true') return true
  throw createConfigurationError()
}

function requireApiKey(env, name) {
  const value = env[name]
  if (typeof value !== 'string' || value.trim() === '') throw createConfigurationError()
  return value
}
function readOptionalFiniteNumber(env, name, minimum, maximum, fallback = null) {
  const value = env[name]
  if (value === undefined || value.trim() === '') return fallback
  const number = Number(value)
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null
}


function readOptionalPositiveInteger(env, name, maximum, fallback = null) {
  const value = env[name]
  if (value === undefined || value.trim() === '') return fallback
  const number = Number(value)
  return Number.isInteger(number) && number > 0 && number <= maximum ? number : null
}

function loadEnvironment(loadEnvFile) {
  try {
    loadEnvFile()
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw Object.assign(new Error('Environment configuration could not be loaded'), {
      code: 'environment_load_error',
    })
  }
}

export function loadAiProviderConfig({ env = process.env, loadEnvFile = defaultLoader } = {}) {
  loadEnvironment(loadEnvFile)
  const jevEnabled = readFeatureFlag(env, 'JEV_CATEGORY_SUGGESTION_ENABLED')
  const nghienAiEnabled = readFeatureFlag(env, 'NGHIENAI_LLM_ENABLED')

  return {
    jev: {
      enabled: jevEnabled,
      ...(jevEnabled ? { apiKey: requireApiKey(env, 'OPENROUTER_API_KEY') } : {}),
      minimumConfidence: readOptionalFiniteNumber(env, 'JEV_MINIMUM_CONFIDENCE', 0, 1, jevEnabled ? 0.8 : null),
      maxCandidates: readOptionalPositiveInteger(env, 'JEV_MAX_CANDIDATES', 254, jevEnabled ? 10 : null),
    },
    nghienAi: {
      enabled: nghienAiEnabled,
      ...(nghienAiEnabled ? { apiKey: requireApiKey(env, 'NGHIENAI_API_KEY') } : {}),
      baseUrl: env.NGHIENAI_BASE_URL ?? DEFAULT_NGHIENAI_BASE_URL,
      model: NGHIENAI_MODEL,
    },
  }
}
