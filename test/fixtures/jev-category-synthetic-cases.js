const paymentCategories = [
  'food', 'transport', 'books', 'housing', 'utilities',
  'health', 'phone', 'supplies', 'fees', 'personal',
]

const incomeCategories = ['stipend', 'scholarship', 'family_support', 'wages', 'refund']

function makeCase(caseId, split, expectedCategoryId, predictedCategoryId, confidence) {
  return Object.freeze({ caseId, split, expectedCategoryId, predictedCategoryId, confidence })
}

const calibrationCases = [
  ...paymentCategories.map((categoryId, index) => makeCase(`cal-payment-${index + 1}`, 'calibration', categoryId, categoryId, 0.96 - index * 0.005)),
  ...paymentCategories.slice(0, 8).map((_, index) => makeCase(`cal-income-${index + 1}`, 'calibration', incomeCategories[index % incomeCategories.length], incomeCategories[index % incomeCategories.length], 0.94 - index * 0.005)),
  ...paymentCategories.slice(0, 8).map((_, index) => makeCase(`cal-cross-${index + 1}`, 'calibration', incomeCategories[index % incomeCategories.length], paymentCategories[(index + 1) % paymentCategories.length], 0.78 - index * 0.01)),
  ...incomeCategories.slice(0, 7).map((categoryId, index) => makeCase(`cal-ambiguous-${index + 1}`, 'calibration', categoryId, 'other_or_uncertain', 0.62 - index * 0.01)),
  ...paymentCategories.slice(0, 12).map((categoryId, index) => makeCase(`cal-low-${index + 1}`, 'calibration', categoryId, categoryId, 0.68 - index * 0.005)),
  ...paymentCategories.slice(0, 4).map((categoryId, index) => makeCase(`cal-wrong-high-${index + 1}`, 'calibration', incomeCategories[index], paymentCategories[index], 0.85 - index * 0.005)),
]
const heldoutCases = [
  ...paymentCategories.slice(0, 9).map((categoryId, index) => makeCase(`hold-correct-${index + 1}`, 'heldout', categoryId, categoryId, 0.96 - index * 0.005)),
  ...paymentCategories.slice(0, 4).map((categoryId, index) => makeCase(`hold-wrong-${index + 1}`, 'heldout', categoryId, paymentCategories[(index + 1) % paymentCategories.length], 0.91 - index * 0.005)),
  makeCase('hold-uncertain', 'heldout', null, 'other_or_uncertain', 0.99),
  makeCase('hold-missed', 'heldout', 'housing', 'housing', 0.72),
]

export const syntheticCategoryCases = Object.freeze([...calibrationCases, ...heldoutCases])
