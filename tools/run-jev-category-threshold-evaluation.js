import { syntheticCategoryCases } from '../test/fixtures/jev-category-synthetic-cases.js'
import { runThresholdEvaluation } from './jev-category-threshold-evaluation.js'

const report = runThresholdEvaluation(syntheticCategoryCases)
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
