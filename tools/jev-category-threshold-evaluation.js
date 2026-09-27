const OTHER_OR_UNCERTAIN_ID = 'other_or_uncertain'
const DEFAULT_TARGET_PRECISION = 0.95
const DEFAULT_MINIMUM_SUGGESTIONS = 10
const DEFAULT_THRESHOLDS = Object.freeze([0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95])
function assertConfidence(value) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new TypeError('confidence must be between 0 and 1')
}

function validateCases(cases, requireSplit) {
  if (!Array.isArray(cases) || cases.length === 0) throw new TypeError('cases must be a non-empty array')
  const seenIds = new Set()

  for (const example of cases) {
    if (!example || typeof example !== 'object' || Array.isArray(example)
      || typeof example.caseId !== 'string' || example.caseId.length === 0
      || seenIds.has(example.caseId)
      || (requireSplit && !['calibration', 'heldout'].includes(example.split))
      || (example.expectedCategoryId !== null
        && (typeof example.expectedCategoryId !== 'string' || example.expectedCategoryId.length === 0))
      || typeof example.predictedCategoryId !== 'string' || example.predictedCategoryId.length === 0) {
      throw new TypeError('invalid synthetic category evaluation case')
    }
    assertConfidence(example.confidence)
    seenIds.add(example.caseId)
  }
}

/** Evaluates bounded category suggestions against frozen synthetic expected labels. */
export function evaluateConfidenceThreshold(cases, threshold) {
  validateCases(cases, false)
  assertConfidence(threshold)

  let suggested = 0
  let correctSuggestions = 0
  let incorrectSuggestions = 0
  let correctAbstentions = 0
  let incorrectAbstentions = 0
  let missedKnownCategory = 0

  for (const example of cases) {
    const isSuggestion = example.predictedCategoryId !== OTHER_OR_UNCERTAIN_ID
      && example.confidence >= threshold

    if (isSuggestion) {
      suggested += 1
      if (example.predictedCategoryId === example.expectedCategoryId) correctSuggestions += 1
      else incorrectSuggestions += 1
    } else if (example.predictedCategoryId === OTHER_OR_UNCERTAIN_ID && example.expectedCategoryId === null) {
      correctAbstentions += 1
    } else if (example.expectedCategoryId !== null) {
      missedKnownCategory += 1
    } else {
      incorrectAbstentions += 1
    }
  }

  const precision = suggested === 0 ? null : correctSuggestions / suggested
  return Object.freeze({
    total: cases.length,
    suggested,
    correctSuggestions,
    incorrectSuggestions,
    precision,
    coverage: suggested / cases.length,
    correctAbstentions,
    incorrectAbstentions,
    missedKnownCategory,
  })
}

/**
 * Selects a threshold on synthetic calibration labels, then reports that frozen
 * threshold on a disjoint synthetic held-out split. Results are not provider
 * accuracy or production calibration evidence.
 */
export function runThresholdEvaluation(cases, {
  targetPrecision = DEFAULT_TARGET_PRECISION,
  minimumSuggestions = DEFAULT_MINIMUM_SUGGESTIONS,
  thresholds = DEFAULT_THRESHOLDS,
} = {}) {
  validateCases(cases, true)
  assertConfidence(targetPrecision)
  if (!Number.isInteger(minimumSuggestions) || minimumSuggestions < 1) {
    throw new TypeError('minimumSuggestions must be a positive integer')
  }
  if (!Array.isArray(thresholds) || thresholds.length === 0) throw new TypeError('thresholds must be non-empty')
  for (const threshold of thresholds) assertConfidence(threshold)

  const calibration = cases.filter((example) => example.split === 'calibration')
  const heldout = cases.filter((example) => example.split === 'heldout')
  if (calibration.length === 0 || heldout.length === 0) throw new TypeError('both calibration and heldout splits are required')

  const calibrationMetrics = thresholds.map((threshold) => ({
    threshold,
    metrics: evaluateConfidenceThreshold(calibration, threshold),
  }))
  const eligible = calibrationMetrics
    .filter(({ metrics }) => metrics.suggested >= minimumSuggestions
      && metrics.precision !== null
      && metrics.precision >= targetPrecision)
    .sort((left, right) => left.threshold - right.threshold)
  const selectedThreshold = eligible[0]?.threshold ?? null
  const selectedCalibrationMetrics = eligible[0]?.metrics ?? null

  const heldoutMetrics = selectedThreshold === null
    ? null
    : evaluateConfidenceThreshold(heldout, selectedThreshold)

  return Object.freeze({
    evaluationType: 'synthetic_not_provider_calibration',
    evidenceScope: Object.freeze({
      input: 'preauthored_category_ids_and_confidence_labels',
      providerObservations: false,
      modelQualityClaimsAllowed: false,
      runtimeThresholdAllowed: false,
      unmeasuredCanonicalMetrics: Object.freeze(['override', 'schema_failure', 'fallback', 'p95_latency', 'cost']),
      missingCanonicalInputs: Object.freeze(['description_text', 'locale', 'transaction_type', 'active_candidate_status', 'user_correction']),
    }),
    selectionPolicy: Object.freeze({ targetPrecision, minimumSuggestions, thresholds: Object.freeze([...thresholds]) }),
    corpus: Object.freeze({ total: cases.length, calibration: calibration.length, heldout: heldout.length }),
    calibration: Object.freeze({ threshold: selectedThreshold, metrics: selectedCalibrationMetrics }),
    heldout: Object.freeze({
      threshold: selectedThreshold,
      metrics: heldoutMetrics,
      meetsTarget: heldoutMetrics !== null && heldoutMetrics.precision !== null && heldoutMetrics.precision >= targetPrecision,
    }),
  })
}
