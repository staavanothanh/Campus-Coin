import type { Category, Locale } from './types.js';

const DEFAULT_CATEGORY_NAMES: Record<string, { en: string; vi: string }> = {
  '1': { en: 'Salary', vi: 'Lương' },
  '2': { en: 'Allowance', vi: 'Trợ cấp' },
  '3': { en: 'Gift', vi: 'Quà tặng' },
  '4': { en: 'Other income', vi: 'Khác' },
  '5': { en: 'Food & Dining', vi: 'Ăn uống' },
  '6': { en: 'Transport', vi: 'Di chuyển' },
  '7': { en: 'Shopping', vi: 'Mua sắm' },
  '8': { en: 'Entertainment', vi: 'Giải trí' },
  '9': { en: 'Education', vi: 'Học tập' },
  '10': { en: 'Rent & Utilities', vi: 'Nhà ở & Điện nước' },
  '11': { en: 'Other payment', vi: 'Khác' },
};

export function formatCategoryName(categoryId: string | number, categories: Category[], locale: Locale): string {
  const id = String(categoryId);
  const serverCategory = categories.find(category => category.id === id);
  if (serverCategory) return serverCategory.name[locale] || serverCategory.name[locale === 'vi' ? 'en' : 'vi'] || id;
  return DEFAULT_CATEGORY_NAMES[id]?.[locale] ?? id;
}
