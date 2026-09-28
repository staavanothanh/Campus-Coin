import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import type { Category } from '../types.js';

export function useCategories(): { categories: Category[]; hasError: boolean; isLoading: boolean; retry(): void } {
  const [categories, setCategories] = useState<Category[]>([]);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setHasError(false);
    setIsLoading(true);
    void apiRequest<Category[]>('/categories?includeDisabled=true').then(nextCategories => {
      if (active) setCategories(nextCategories);
    }).catch(() => {
      if (active) setHasError(true);
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [reloadKey]);

  return { categories, hasError, isLoading, retry: () => { if (!isLoading) { setHasError(false); setIsLoading(true); setReloadKey(key => key + 1); } } };
}
