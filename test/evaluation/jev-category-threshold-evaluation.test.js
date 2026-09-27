import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  evaluateConfidenceThreshold,
  runThresholdEvaluation,
} from '../../tools/jev-category-threshold-evaluation.js'
import { syntheticCategoryCases } from '../fixtures/jev-category-synthetic-cases.js'

const calibration = syntheticCategoryCases.filter((example) => example.split === 'calibration')
const heldOut = syntheticCategoryCases.filter((example) => example.split === 'heldout')

describe('synthetic JEV category threshold evaluation', () => {
  it('selects the lowest calibration threshold meeting the documented precision target', () => {
    const report = runThresholdEvaluation(syntheticCategoryCases)

    assert.equal(report.evaluationType, 'synthetic_not_provider_calibration')
    assert.equal(report.corpus.total, 60)
    assert.equal(report.corpus.calibration, 45)
    assert.equal(report.corpus.heldout, 15)
    assert.equal(report.selectionPolicy.targetPrecision, 0.95)
    assert.equal(report.calibration.threshold, 0.9)
    assert.equal(report.calibration.metrics.suggested, 18)
    assert.equal(report.calibration.metrics.precision, 1)
  })

  it('measures the frozen threshold on held-out labels without changing the recommendation', () => {
    const report = runThresholdEvaluation(syntheticCategoryCases)

    assert.equal(report.heldout.threshold, report.calibration.threshold)
    assert.equal(report.heldout.metrics.total, heldOut.length)
    assert.equal(report.heldout.metrics.suggested, 12)
    assert.equal(report.heldout.metrics.correctSuggestions, 9)
    assert.equal(report.heldout.metrics.incorrectSuggestions, 3)
    assert.equal(report.heldout.metrics.precision, 0.75)
    assert.equal(report.heldout.metrics.correctAbstentions, 1)
    assert.equal(report.heldout.metrics.missedKnownCategory, 2)
    assert.equal(report.heldout.meetsTarget, false)
  })

  it('counts exact-threshold candidates as suggestions and keeps uncertain choices manual', () => {
    const metrics = evaluateConfidenceThreshold([
      { caseId: 'exact', predictedCategoryId: 'food', expectedCategoryId: 'food', confidence: 0.8 },
      { caseId: 'uncertain', predictedCategoryId: 'other_or_uncertain', expectedCategoryId: null, confidence: 0.99 },
    ], 0.8)

    assert.equal(metrics.suggested, 1)
    assert.equal(metrics.correctSuggestions, 1)
    assert.equal(metrics.correctAbstentions, 1)
  })

  it('does not invent a threshold when no candidate meets the minimum sample and precision gates', () => {
    const recommendation = runThresholdEvaluation([
      { caseId: 'one', split: 'calibration', predictedCategoryId: 'food', expectedCategoryId: 'transport', confidence: 0.99 },
      { caseId: 'two', split: 'heldout', predictedCategoryId: 'food', expectedCategoryId: 'food', confidence: 0.99 },
    ], { minimumSuggestions: 2 })

    assert.equal(recommendation.calibration.threshold, null)
    assert.equal(recommendation.heldout.threshold, null)
  })

  it('rejects invalid scores and empty labels before computing metrics', () => {
    assert.throws(() => evaluateConfidenceThreshold([
      { caseId: 'bad-score', predictedCategoryId: 'food', expectedCategoryId: 'food', confidence: 1.1 },
    ], 0.8), { name: 'TypeError' })
    assert.throws(() => evaluateConfidenceThreshold([
      { caseId: 'empty-label', predictedCategoryId: 'food', expectedCategoryId: '', confidence: 0.9 },
    ], 0.8), { name: 'TypeError' })
  })

  it('keeps calibration and held-out case identifiers disjoint', () => {
    const duplicated = [
      { caseId: 'same', split: 'calibration', predictedCategoryId: 'food', expectedCategoryId: 'food', confidence: 0.95 },
      { caseId: 'same', split: 'heldout', predictedCategoryId: 'food', expectedCategoryId: 'food', confidence: 0.95 },
    ]

    assert.throws(() => runThresholdEvaluation(duplicated), { name: 'TypeError' })
  })

  it('uses disjoint examples for threshold selection and held-out scoring', () => {
    assert.equal(calibration.length, 45)
    assert.equal(heldOut.length, 15)
    assert.equal(new Set(calibration.map(({ caseId }) => caseId)).size, calibration.length)
    assert.equal(new Set(heldOut.map(({ caseId }) => caseId)).size, heldOut.length)
  })

  it('reports the synthetic-only evidence boundary and unsupported canonical metrics', () => {
    const report = runThresholdEvaluation(syntheticCategoryCases);

    assert.deepEqual(report.evidenceScope, {
      input: 'preauthored_category_ids_and_confidence_labels',
      providerObservations: false,
      modelQualityClaimsAllowed: false,
      runtimeThresholdAllowed: false,
      unmeasuredCanonicalMetrics: ['override', 'schema_failure', 'fallback', 'p95_latency', 'cost'],
      missingCanonicalInputs: ['description_text', 'locale', 'transaction_type', 'active_candidate_status', 'user_correction'],
    });
  })
})
