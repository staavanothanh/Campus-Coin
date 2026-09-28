import { useState, type FormEvent } from 'react';
import { apiPut, ApiRequestError } from '../api-client.js';
import { parseAmountVnd } from '../format.js';
import type { Budget, Category, UpsertBudgetRequest, Locale } from '../types.js';
import type { Copy } from '../i18n.js';
import { Modal } from './Modal.js';
import { ErrorBanner } from './ErrorBanner.js';
import { useFormattedAmountInput } from '../hooks/use-formatted-amount-input.js';

interface BudgetFormProps {
  categoryId: string;
  categoryName?: string | undefined;
  categoryOptions?: readonly Category[];
  month: string;
  initialLimitVnd: number | null;
  csrfToken: string;
  t: Copy;
  locale: Locale;
  onClose: () => void;
  onSuccess: () => void;
}

export function BudgetForm({
  categoryId,
  categoryName,
  categoryOptions = [],
  month,
  initialLimitVnd,
  csrfToken,
  t,
  locale,
  onClose,
  onSuccess,
}: BudgetFormProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId);
  const selectedCategory = categoryOptions.find(category => String(category.id) === selectedCategoryId);
  const selectedCategoryName = selectedCategory === undefined
    ? categoryName
    : locale === 'vi' ? (selectedCategory.name.vi || selectedCategory.name.en) : (selectedCategory.name.en || selectedCategory.name.vi);
  const { rawValue: limit, setRawValue: setLimit, formattedValue: formattedLimit, inputRef: limitInputRef, handleChange: handleLimitChange } = useFormattedAmountInput(initialLimitVnd ? initialLimitVnd.toString() : '', locale);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiRequestError | string | null>(null);
  const title = locale === 'vi' ? `${initialLimitVnd === null ? 'Thêm' : 'Thiết lập'} ngân sách` : `${initialLimitVnd === null ? 'Add' : 'Set'} Budget`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    setError(null);

    const limitVnd = parseAmountVnd(limit);
    if (limitVnd === null) {
      setError(t.amountInvalid);
      return;
    }

    setLoading(true);

    const requestBody: UpsertBudgetRequest = {
      month,
      limitVnd,
    };

    try {
      await apiPut<Budget>(
        `/budgets/${selectedCategoryId}`,
        requestBody,
        {
          'X-CSRF-Token': csrfToken,
          'Idempotency-Key': crypto.randomUUID(),
        }
      );

      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err);
      } else {
        setError(t.serverError);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel={title}>
      <form onSubmit={submit}>
        <div className="panel-heading">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t.close}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <ErrorBanner error={error instanceof ApiRequestError ? error.apiError : error} locale={locale} />

        {categoryOptions.length > 0 ? (
          <label htmlFor="budget-category-select">
            {locale === 'vi' ? 'Danh mục' : 'Category'}
            <select id="budget-category-select" value={selectedCategoryId} onChange={event => setSelectedCategoryId(event.currentTarget.value)} disabled={loading}>
              {categoryOptions.map(category => <option key={category.id} value={category.id}>{locale === 'vi' ? (category.name.vi || category.name.en) : (category.name.en || category.name.vi)}</option>)}
            </select>
          </label>
        ) : null}
        <p style={{ marginBottom: 'var(--space-4)' }}>
          <strong>{locale === 'vi' ? 'Danh mục' : 'Category'}:</strong> {selectedCategoryName || selectedCategoryId}
        </p>

        <label>
          {locale === 'vi' ? 'Giới hạn ngân sách (VND)' : 'Budget limit (VND)'}
          <input
            required
            inputMode="numeric"
            ref={limitInputRef}
            value={formattedLimit}
            onChange={handleLimitChange}
            disabled={loading}
            placeholder="0"
          />
        </label>

        <button
          className="primary-button"
          type="submit"
          disabled={loading || !limit}
        >
          {loading ? t.loading : (locale === 'vi' ? 'Lưu ngân sách' : 'Save budget')}
        </button>
      </form>
    </Modal>
  );
}
