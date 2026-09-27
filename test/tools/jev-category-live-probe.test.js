import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { runLiveProbe } from '../../tools/jev-category-live-probe.js'

const completeConfig = Object.freeze({
  JEV_CATEGORY_SUGGESTION_ENABLED: 'true',
  OPENROUTER_API_KEY: 'synthetic-test-value-not-a-credential',
  JEV_MINIMUM_CONFIDENCE: '0.8',
  JEV_MAX_CANDIDATES: '10',
})

describe('gated live JEV probe', () => {
  it('refuses without the explicit approval value before a provider request', async () => {
    let providerRequests = 0

    await assert.rejects(runLiveProbe({
      env: completeConfig,
      fetchImpl: async () => { providerRequests += 1 },
    }), { code: 'jev_live_probe_not_approved' })

    assert.equal(providerRequests, 0)
  })

  it('does not accept a generic truthy approval value', async () => {
    await assert.rejects(runLiveProbe({
      env: { ...completeConfig, JEV_LIVE_PROBE_APPROVED: 'true' },
      fetchImpl: async () => assert.fail('provider must not be called'),
    }), { code: 'jev_live_probe_not_approved' })
  })

  it('refuses when provider configuration is incomplete even after approval', async () => {
    await assert.rejects(runLiveProbe({
      env: {
        ...completeConfig,
        JEV_LIVE_PROBE_APPROVED: 'I_APPROVE_ONE_LIVE_JEV_PROBE',
        OPENROUTER_API_KEY: '',
      },
      fetchImpl: async () => assert.fail('provider must not be called'),
    }), { code: 'jev_live_probe_configuration_invalid' })
  })

  it('refuses when the feature flag or bounded policy is absent', async (context) => {
    for (const [name, override] of [
      ['feature flag off', { JEV_CATEGORY_SUGGESTION_ENABLED: 'false' }],
      ['missing confidence policy', { JEV_MINIMUM_CONFIDENCE: '' }],
      ['missing candidate bound', { JEV_MAX_CANDIDATES: '' }],
    ]) {
      await context.test(name, async () => {
        await assert.rejects(runLiveProbe({
          env: {
            ...completeConfig,
            ...override,
            JEV_LIVE_PROBE_APPROVED: 'I_APPROVE_ONE_LIVE_JEV_PROBE',
          },
          fetchImpl: async () => assert.fail('provider must not be called'),
        }), { code: 'jev_live_probe_configuration_invalid' })
      })
    }
  })

  it('uses fixed synthetic inputs and returns only normalized metadata after approval', async () => {
    const responseBody = JSON.stringify({
      id: 'raw-response-id-must-not-escape',
      model: 'typesafe/jev-1.13',
      answers: {
        category: {
          type: 'choice',
          choice: 'salary',
          confidence: 0.93,
          probabilities: { salary: 0.93, allowance: 0.07, other_or_uncertain: 0 },
        },
      },
      usage: { input_tokens: 22, output_tokens: 6, cost: 0.00002 },
    })
    let requestCount = 0
    let requestText = ''
    let redirectMode
    const fetchImpl = async (_url, options) => {
      requestCount += 1
      requestText = options.body
      redirectMode = options.redirect
      return { status: 200, json: async () => JSON.parse(responseBody) }
    }
    const result = await runLiveProbe({
      env: { ...completeConfig, JEV_LIVE_PROBE_APPROVED: 'I_APPROVE_ONE_LIVE_JEV_PROBE' },
      fetchImpl,
    })

    assert.deepEqual(result, { status: 'suggested', confidence: 0.93, reasonCode: null })
    assert.equal(requestCount, 1)
    assert.match(requestText, /Synthetic campus cafe shift salary/)
    assert.equal(requestText.includes(completeConfig.OPENROUTER_API_KEY), false)
    assert.equal(JSON.stringify(result).includes('raw-response-id-must-not-escape'), false)
    assert.equal(redirectMode, 'error')
  })
})

it('refuses from the CLI by default without loading credentials or making a provider request', () => {
  const scriptPath = fileURLToPath(new URL('../../tools/run-jev-category-live-probe.js', import.meta.url))
  const child = spawnSync(process.execPath, [scriptPath], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '' },
  })

  assert.equal(child.status, 1)
  assert.equal(child.stdout, '')
  assert.equal(child.stderr.trim(), 'Refusing live JEV probe: explicit approval is required.')
})
