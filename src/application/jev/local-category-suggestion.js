import { CANONICAL_CATEGORIES, normalizeCategoryLabel } from '../../domain/category-taxonomy.ts'

const CATEGORY_BY_TYPE = Object.freeze({
  income: Object.freeze({
    1: ['salary', 'wage', 'payroll', 'pay', 'luong', 'tien luong', 'lam them', 'part time', 'freelance', 'intern', 'tutor', 'research assistant', 'teaching assistant'],
    2: ['allowance', 'stipend', 'scholarship', 'tro cap', 'sinh hoat phi', 'family support', 'student support', 'parents', 'bme', 'bo gui', 'me gui'],
    3: ['gift', 'present', 'bonus gift', 'qua tang', 'li xi', 'tien mung', 'mung tuoi', 'birthday gift', 'graduation gift', 'holiday gift'],
    4: ['other income', 'cashback', 'refund', 'rebate', 'resale', 'ban do cu', 'ban hang', 'interest income', 'deposit return', 'roommate returned'],
  }),
  payment: Object.freeze({
    5: ['food dining', 'food', 'dining', 'meal', 'lunch', 'dinner', 'breakfast', 'an uong', 'com', 'ca phe', 'coffee', 'tra sua', 'bubble tea', 'snack', 'canteen', 'restaurant', 'hotpot'],
    6: ['transport', 'transportation', 'fuel', 'parking', 'bus', 'grab', 'bike', 'taxi', 'di chuyen', 'do xang', 'gui xe', 'motorbike', 'scooter', 'ride'],
    7: ['shopping', 'clothing', 'apparel', 'toiletries', 'mua sam', 'mua ao', 'mua do', 'skincare', 'shoes', 'sneakers', 'backpack', 'towel', 'rice cooker'],
    8: ['entertainment', 'movie', 'cinema', 'gaming', 'karaoke', 'streaming', 'giai tri', 'xem phim', 'board game', 'camping', 'concert', 'music'],
    9: ['education', 'tuition', 'textbook', 'course', 'school', 'hoc tap', 'hoc phi', 'giao trinh', 'photo tai lieu', 'photocopy', 'exam', 'stationery', 'notebook', 'english course'],
    10: ['rent utilities', 'rent', 'utility', 'utilities', 'internet', 'electricity', 'water bill', 'nha o', 'tien tro', 'tien dien', 'tien nuoc', 'dorm', 'wifi', 'garbage'],
    11: ['other payment', 'student union', 'class fund', 'card reissue', 'maintenance', 'repair', 'library penalty', 'bank fee', 'health checkup', 'replacement key', 'compensation', 'fine'],
  }),
})

const CATEGORY_IDS = Object.freeze({ income: Object.freeze([1, 2, 3, 4]), payment: Object.freeze([5, 6, 7, 8, 9, 10, 11]) })
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
