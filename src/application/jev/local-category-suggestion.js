import { CANONICAL_CATEGORIES, CANONICAL_CATEGORY_ALIASES, normalizeCategoryLabel } from '../../domain/category-taxonomy.ts'

const CATEGORY_BY_TYPE = Object.freeze(Object.fromEntries(
  ['income', 'payment'].map(transactionType => [transactionType, Object.fromEntries(
    CANONICAL_CATEGORIES
      .filter(category => category.type === transactionType)
      .map(category => [category.id, CANONICAL_CATEGORY_ALIASES[category.key]]),
  )]),
))

const CATEGORY_IDS = Object.freeze(Object.fromEntries(
  Object.entries(CATEGORY_BY_TYPE).map(([transactionType, categories]) => [transactionType, Object.freeze(Object.keys(categories).map(Number))]),
))
const STATUS = Object.freeze({ status: 'suggested', confidence: 0.94, reasonCode: null })

function includesPhrase(text, phrase) {
  const normalizedPhrase = normalizeCategoryLabel(phrase)
  return text === normalizedPhrase || text.includes(` ${normalizedPhrase} `) || text.startsWith(`${normalizedPhrase} `) || text.endsWith(` ${normalizedPhrase}`)
}

function scoreCategory(text, aliases) {
  return aliases.reduce((score, alias) => score + (includesPhrase(text, alias) ? (alias.includes(' ') ? 3 : 1) : 0), 0)
}

export function suggestLocalCategory({ transactionType, description }) {
  if (!Array.isArray(CATEGORY_IDS[transactionType]) || typeof description !== 'string' || description.trim() === '') {
    return { status: 'manual', categoryId: null, confidence: null, reasonCode: 'schema' }
  }
  const text = normalizeCategoryLabel(description)
  const scores = CATEGORY_IDS[transactionType].map(categoryId => ({
    categoryId: String(categoryId),
    score: scoreCategory(text, CATEGORY_BY_TYPE[transactionType][categoryId]),
  })).sort((left, right) => right.score - left.score)
  const best = scores[0]
  const next = scores[1]
  if (!best || best.score === 0 || (next && best.score === next.score)) {
    return { status: 'manual', categoryId: null, confidence: null, reasonCode: 'low_confidence' }
  }
  return { ...STATUS, categoryId: best.categoryId }
}

export function localSuggestionCorpusSize() {
  return Object.values(CATEGORY_BY_TYPE).flatMap(categories => Object.values(categories)).reduce((sum, aliases) => sum + aliases.length, 0)
}
