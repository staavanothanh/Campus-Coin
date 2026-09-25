import { useEffect, useState } from 'react';
import { apiGet } from '../api-client.js';
import type { Category, TransactionType, Locale } from '../types.js';

interface CategorySelectProps {
  appliesTo: TransactionType;
  value: string;
  onChange: (categoryId: string) => void;
  locale: Locale;
  label: string;
  placeholder: string;
  disabled?: boolean;
}

/**
 * Category picker that fetches active categories from GET /categories.
 * Filters by appliesTo (income/payment) and displays en/vi name per locale.
 * Shows loading/error state in the placeholder option.
 */
export function CategorySelect({
  appliesTo,
  value,
  onChange,
  locale,
  label,
  placeholder,
  disabled,
}: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHasError(false);

    apiGet<Category[]>(`/categories?appliesTo=${appliesTo}`)
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [appliesTo]);

  const activeCategories = categories.filter((c) => c.status === 'active');

  const placeholderText = loading
    ? '\u2026'
    : hasError
      ? '\u26A0 ' + placeholder
      : placeholder;

  return (
    <label>
      {label}
      <select
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        aria-busy={loading}
      >
        <option value="" disabled>
          {placeholderText}
        </option>
        {activeCategories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {locale === 'vi' ? (cat.name.vi || cat.name.en) : cat.name.en}
          </option>
        ))}
      </select>
    </label>
  );
}
