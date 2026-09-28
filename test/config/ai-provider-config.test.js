import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadAiProviderConfig, mergeMissingEnvironment } from '../../src/config/ai-provider-config.js'
const defaultEnv = Object.freeze({})

function createConfig(env = defaultEnv, loadEnvFile = () => {}) {
  return loadAiProviderConfig({ env, loadEnvFile })
}

describe('AI provider runtime configuration', () => {
  it('fills empty inherited environment values without overriding non-empty values', () => {
    const env = { OPENROUTER_API_KEY: '', NGHIENAI_API_KEY: 'existing-key' }
    mergeMissingEnvironment(env, {
      OPENROUTER_API_KEY: 'file-openrouter-key',
      NGHIENAI_API_KEY: 'file-nghienai-key',
    })

    assert.equal(env.OPENROUTER_API_KEY, 'file-openrouter-key')
    assert.equal(env.NGHIENAI_API_KEY, 'existing-key')
  })

  it('keeps JEV disabled when no explicit feature flag is set, even with a server API key', () => {
    const config = createConfig({ OPENROUTER_API_KEY: 'synthetic-openrouter-key' })
    assert.equal(config.jev.enabled, false)
    assert.equal(Object.hasOwn(config.jev, 'apiKey'), false)
  })
  it('keeps JEV disabled when explicitly disabled even if a server key is present', () => {
    const config = createConfig({ JEV_CATEGORY_SUGGESTION_ENABLED: 'false', OPENROUTER_API_KEY: 'synthetic-openrouter-key' })
    assert.equal(config.jev.enabled, false)
    assert.equal(Object.hasOwn(config.jev, 'apiKey'), false)
  })
  it('exposes configured JEV confidence and candidate limits', () => {
    const config = createConfig({
      JEV_MINIMUM_CONFIDENCE: '0.75',
      JEV_MAX_CANDIDATES: '12',
    })

    assert.equal(config.jev.minimumConfidence, 0.75)
    assert.equal(config.jev.maxCandidates, 12)
  })

  it('uses null for missing or invalid optional JEV safety settings', () => {
    const missingConfig = createConfig()
    const invalidConfig = createConfig({
      JEV_MINIMUM_CONFIDENCE: '1.01',
      JEV_MAX_CANDIDATES: '2.5',
    })

    assert.equal(missingConfig.jev.minimumConfidence, null)
    assert.equal(missingConfig.jev.maxCandidates, null)
    assert.equal(invalidConfig.jev.minimumConfidence, null)
    assert.equal(invalidConfig.jev.maxCandidates, null)
  })

  it('accepts JEV confidence bounds and rejects non-positive candidate limits', () => {
    const boundaryConfig = createConfig({
      JEV_MINIMUM_CONFIDENCE: '1',
      JEV_MAX_CANDIDATES: '1',
    })
    const invalidConfig = createConfig({
      JEV_MINIMUM_CONFIDENCE: 'NaN',
      JEV_MAX_CANDIDATES: '0',
    })

    assert.equal(boundaryConfig.jev.minimumConfidence, 1)
    assert.equal(boundaryConfig.jev.maxCandidates, 1)
    assert.equal(invalidConfig.jev.minimumConfidence, null)
    assert.equal(invalidConfig.jev.maxCandidates, null)
  })


  it('does not expose provider keys when features are disabled', () => {
    const config = createConfig({
      JEV_CATEGORY_SUGGESTION_ENABLED: 'false',
      OPENROUTER_API_KEY: 'synthetic-openrouter-key',
      NGHIENAI_LLM_ENABLED: 'false',
      NGHIENAI_API_KEY: 'synthetic-nghienai-key',
    })

    assert.equal(Object.hasOwn(config.jev, 'apiKey'), false)
    assert.equal(Object.hasOwn(config.nghienAi, 'apiKey'), false)
    assert.equal(JSON.stringify(config).includes('synthetic-'), false)
  })

  it('requires the OpenRouter key when JEV is explicitly enabled', () => {
    assert.throws(
      () => createConfig({ JEV_CATEGORY_SUGGESTION_ENABLED: 'true' }),
      (error) => error.code === 'provider_configuration_error',
    )
  })

  it('degrades NghienAI to disabled instead of crashing when enabled without a key', () => {
    const config = createConfig({ NGHIENAI_LLM_ENABLED: 'true' })
    assert.equal(config.nghienAi.enabled, false)
    assert.equal(Object.hasOwn(config.nghienAi, 'apiKey'), false)
  })

  it('returns server-side keys for enabled providers', () => {
    const config = createConfig({
      JEV_CATEGORY_SUGGESTION_ENABLED: 'true',
      OPENROUTER_API_KEY: 'synthetic-openrouter-key',
      NGHIENAI_LLM_ENABLED: 'true',
      NGHIENAI_API_KEY: 'synthetic-nghienai-key',
    })

    assert.equal(config.jev.enabled, true)
    assert.equal(config.jev.apiKey, 'synthetic-openrouter-key')
    assert.equal(config.nghienAi.enabled, true)
    assert.equal(config.nghienAi.apiKey, 'synthetic-nghienai-key')
  })

  it('defaults NghienAI safety limits when enabled with a key', () => {
    const config = createConfig({
      NGHIENAI_LLM_ENABLED: 'true',
      NGHIENAI_API_KEY: 'synthetic-nghienai-key',
    })

    assert.equal(config.nghienAi.enabled, true)
    assert.equal(config.nghienAi.minimumConfidence, 0.8)
    assert.equal(config.nghienAi.maxCandidates, 10)
  })

  it('exposes configured NghienAI confidence and candidate limits', () => {
    const config = createConfig({
      NGHIENAI_LLM_ENABLED: 'true',
      NGHIENAI_API_KEY: 'synthetic-nghienai-key',
      NGHIENAI_MINIMUM_CONFIDENCE: '0.6',
      NGHIENAI_MAX_CANDIDATES: '8',
    })

    assert.equal(config.nghienAi.minimumConfidence, 0.6)
    assert.equal(config.nghienAi.maxCandidates, 8)
  })

  it('rejects unrecognized feature-flag values instead of enabling a provider', () => {
    for (const [flag, value] of [
      ['JEV_CATEGORY_SUGGESTION_ENABLED', 'TRUE'],
      ['NGHIENAI_LLM_ENABLED', 'yes'],
    ]) {
      assert.throws(
        () => createConfig({ [flag]: value }),
        (error) => error.code === 'provider_configuration_error',
      )
    }
  })

  it('uses the pinned NghienAI model and default base URL', () => {
    const config = createConfig()

    assert.equal(config.nghienAi.model, 'gpt-6-luna')
    assert.equal(config.nghienAi.baseUrl, 'https://api.aixingialaire.shop/v1')
  })

  it('allows the NghienAI base URL to be overridden', () => {
    const config = createConfig({ NGHIENAI_BASE_URL: 'https://synthetic.example/v1' })

    assert.equal(config.nghienAi.baseUrl, 'https://synthetic.example/v1')
    assert.equal(config.nghienAi.model, 'gpt-6-luna')
  })

  it('uses dotenv loader to read runtime env without exposing dotenv errors', () => {
    let loaded = false
    const env = {}
    const config = loadAiProviderConfig({
      env,
      loadEnvFile: () => {
        loaded = true
        env.JEV_CATEGORY_SUGGESTION_ENABLED = 'false'
      },
    })
    assert.equal(loaded, true)
    assert.equal(config.jev.enabled, false)
  })
  it('caps the configured JEV candidate count to the effective application limit', () => {
    const boundaryConfig = createConfig({ JEV_MAX_CANDIDATES: '254' })
    const invalidConfig = createConfig({ JEV_MAX_CANDIDATES: '255' })
    assert.equal(boundaryConfig.jev.maxCandidates, 254)
    assert.equal(invalidConfig.jev.maxCandidates, null)
  })
  it('tolerates an absent project .env file when using the default dotenv loader', () => {
    const config = loadAiProviderConfig({ env: {} })
    assert.equal(config.jev.enabled, false)
    assert.equal(config.nghienAi.enabled, false)
  })



  it('runs the environment loader before reading the supplied environment', () => {
    const env = {}
    const config = createConfig(env, () => {
      env.JEV_CATEGORY_SUGGESTION_ENABLED = 'true'
      env.OPENROUTER_API_KEY = 'synthetic-openrouter-key'
    })

    assert.equal(config.jev.enabled, true)
    assert.equal(config.jev.apiKey, 'synthetic-openrouter-key')
  })

  it('tolerates an absent dotenv file reported as ENOENT', () => {
    const missingFile = Object.assign(new Error('synthetic missing-file detail'), { code: 'ENOENT' })
    const config = createConfig({}, () => {
      throw missingFile
    })

    assert.equal(config.jev.enabled, false)
    assert.equal(config.nghienAi.enabled, false)
  })

  it('normalizes other environment-load errors without leaking their details', () => {
    const secretMarker = 'SENSITIVE_DOTENV_ERROR_MARKER'
    const loadError = new Error(secretMarker)
    assert.throws(
      () => createConfig({}, () => {
        throw loadError
      }),
      (error) => {
        assert.equal(error.code, 'environment_load_error')
        assert.equal(error.message.includes(secretMarker), false)
        return true
      },
    )
  })
})
