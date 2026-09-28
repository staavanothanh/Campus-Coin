import { useState, useEffect } from 'react';
import { apiGet } from '../api-client.js';
import type { Category, Locale } from '../types.js';

export const DEFAULT_CATEGORY_NAMES: Record<string, { en: string; vi: string }> = {
  '1': { en: 'Salary', vi: 'Lương' },
  '2': { en: 'Allowance', vi: 'Trợ cấp' },
  '3': { en: 'Gift', vi: 'Quà tặng' },
  '4': { en: 'Other income', vi: 'Thu nhập khác' },
  '5': { en: 'Food & Dining', vi: 'Ăn uống' },
  '6': { en: 'Transport', vi: 'Di chuyển' },
  '7': { en: 'Shopping', vi: 'Mua sắm' },
  '8': { en: 'Entertainment', vi: 'Giải trí' },
  '9': { en: 'Education', vi: 'Học tập' },
  '10': { en: 'Rent & Utilities', vi: 'Nhà ở & Điện nước' },
  '11': { en: 'Other payment', vi: 'Chi tiêu khác' },
};

let cachedCategories: Category[] | null = null;
let fetchPromise: Promise<Category[]> | null = null;

export async function fetchCategories(): Promise<Category[]> {
  if (cachedCategories) return cachedCategories;
  if (!fetchPromise) {
    fetchPromise = apiGet<Category[]>('/categories')
      .then((data) => {
        cachedCategories = data;
        return data;
      })
      .finally(() => {
        fetchPromise = null;
      });
  }
  return fetchPromise;
}

export function invalidateCategoriesCache(): void {
  cachedCategories = null;
}

export function formatCategoryName(
  categoryId: string | number,
  categories: Category[],
  locale: Locale
): string {
  const idStr = String(categoryId);
  const found = categories.find((c) => String(c.id) === idStr);
  if (found) {
    return locale === 'vi' ? (found.name.vi || found.name.en) : (found.name.en || found.name.vi);
  }
  const def = DEFAULT_CATEGORY_NAMES[idStr];
  if (def) {
    return locale === 'vi' ? def.vi : def.en;
  }
  return idStr;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(cachedCategories ?? []);
  const [loading, setLoading] = useState(!cachedCategories);

  useEffect(() => {
    let mounted = true;
    void fetchCategories()
      .then((data) => {
        if (mounted) {
          setCategories(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const getCategoryName = (categoryId: string | number, locale: Locale): string => {
    return formatCategoryName(categoryId, categories, locale);
  };

  return { categories, loading, getCategoryName };
}
