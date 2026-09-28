export type CanonicalCategoryType = "income" | "payment";
export type CanonicalCategoryKey =
  | "income_salary"
  | "income_allowance"
  | "income_gift"
  | "income_other"
  | "payment_food"
  | "payment_transport"
  | "payment_shopping"
  | "payment_entertainment"
  | "payment_education"
  | "payment_housing"
  | "payment_other";

export interface CanonicalCategoryDefinition {
  readonly id: number;
  readonly type: CanonicalCategoryType;
  readonly nameEn: string;
  readonly nameVi: string;
  readonly key: CanonicalCategoryKey;
}

export const CANONICAL_CATEGORIES: readonly CanonicalCategoryDefinition[] = Object.freeze([
  { id: 1, type: "income", nameEn: "Salary", nameVi: "Lương", key: "income_salary" },
  { id: 2, type: "income", nameEn: "Allowance", nameVi: "Trợ cấp", key: "income_allowance" },
  { id: 3, type: "income", nameEn: "Gift", nameVi: "Quà tặng", key: "income_gift" },
  { id: 4, type: "income", nameEn: "Other income", nameVi: "Khác", key: "income_other" },
  { id: 5, type: "payment", nameEn: "Food & Dining", nameVi: "Ăn uống", key: "payment_food" },
  { id: 6, type: "payment", nameEn: "Transport", nameVi: "Di chuyển", key: "payment_transport" },
  { id: 7, type: "payment", nameEn: "Shopping", nameVi: "Mua sắm", key: "payment_shopping" },
  { id: 8, type: "payment", nameEn: "Entertainment", nameVi: "Giải trí", key: "payment_entertainment" },
  { id: 9, type: "payment", nameEn: "Education", nameVi: "Học tập", key: "payment_education" },
  { id: 10, type: "payment", nameEn: "Rent & Utilities", nameVi: "Nhà ở & Điện nước", key: "payment_housing" },
  { id: 11, type: "payment", nameEn: "Other payment", nameVi: "Khác", key: "payment_other" },
]);

/** Shared deterministic corpus used for both duplicate prevention and local suggestions. */
export const CANONICAL_CATEGORY_ALIASES: Readonly<Record<CanonicalCategoryKey, readonly string[]>> = Object.freeze({
  income_salary: ["salary", "wage", "payroll", "pay", "luong", "tien luong", "lam them", "part time", "freelance", "intern", "tutor", "research assistant", "teaching assistant"],
  income_allowance: ["allowance", "stipend", "scholarship", "tro cap", "sinh hoat phi", "family support", "student support", "parents", "bme", "bo gui", "me gui"],
  income_gift: ["gift", "present", "bonus gift", "qua tang", "li xi", "tien mung", "mung tuoi", "birthday gift", "graduation gift", "holiday gift"],
  income_other: ["other income", "cashback", "refund", "rebate", "resale", "ban do cu", "ban hang", "interest income", "deposit return", "roommate returned"],
  payment_food: ["food dining", "food", "dining", "meal", "lunch", "dinner", "breakfast", "an uong", "com", "do an", "ca phe", "coffee", "tra sua", "bubble tea", "snack", "canteen", "restaurant", "hotpot"],
  payment_transport: ["transport", "transportation", "fuel", "parking", "bus", "grab", "bike", "taxi", "di chuyen", "do xang", "gui xe", "motorbike", "scooter", "ride"],
  payment_shopping: ["shopping", "clothing", "apparel", "toiletries", "mua sam", "mua ao", "mua do", "skincare", "shoes", "sneakers", "backpack", "towel", "rice cooker"],
  payment_entertainment: ["entertainment", "movie", "cinema", "gaming", "karaoke", "streaming", "giai tri", "xem phim", "board game", "camping", "concert", "music"],
  payment_education: ["education", "tuition", "textbook", "course", "school", "hoc tap", "hoc phi", "giao trinh", "photo tai lieu", "photocopy", "exam", "stationery", "notebook", "english course", "vo ghi chep"],
  payment_housing: ["rent utilities", "rent", "utility", "utilities", "internet", "electricity", "water bill", "nha o", "tien tro", "tien dien", "tien nuoc", "dorm", "wifi", "garbage"],
  payment_other: ["other payment", "student union", "class fund", "card reissue", "maintenance", "repair", "library penalty", "bank fee", "health checkup", "replacement key", "compensation", "fine"],
});

export function normalizeCategoryLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function matchesAlias(normalized: string, alias: string): boolean {
  const aliasValue = normalizeCategoryLabel(alias);
  if (normalized === aliasValue) return true;
  return normalized.includes(` ${aliasValue} `)
    || normalized.startsWith(`${aliasValue} `)
    || normalized.endsWith(` ${aliasValue}`);
}

export function semanticCategoryKey(value: string, type: CanonicalCategoryType): CanonicalCategoryKey | null {
  const normalized = normalizeCategoryLabel(value);
  if (!normalized) return null;
  const canonical = CANONICAL_CATEGORIES.find(category => category.type === type && (
    normalizeCategoryLabel(category.nameEn) === normalized || normalizeCategoryLabel(category.nameVi) === normalized
  ));
  if (canonical) return canonical.key;
  const category = CANONICAL_CATEGORIES.find(candidate => candidate.type === type && CANONICAL_CATEGORY_ALIASES[candidate.key].some(alias => matchesAlias(normalized, alias)));
  return category?.key ?? null;
}

export function canonicalCategoryById(id: number): CanonicalCategoryDefinition | undefined {
  return CANONICAL_CATEGORIES.find(category => category.id === id);
}

export function canonicalCategoryBySemanticKey(key: CanonicalCategoryKey): CanonicalCategoryDefinition {
  const category = CANONICAL_CATEGORIES.find(candidate => candidate.key === key);
  if (!category) throw new Error(`Unknown canonical category key: ${key}`);
  return category;
}

export function isCanonicalCategoryId(id: number, type?: CanonicalCategoryType): boolean {
  const category = canonicalCategoryById(id);
  return category !== undefined && (type === undefined || category.type === type);
}

export const CANONICAL_CATEGORY_COUNTS = Object.freeze({ income: 4, payment: 7 });
