import { useState, type FormEvent } from 'react';
import { apiPut, ApiRequestError } from '../api-client.js';
import { parseAmountVnd } from '../format.js';
import type { Budget, UpsertBudgetRequest, Locale } from '../types.js';
import type { Copy } from '../i18n.js';
import { Modal } from './Modal.js';
import { ErrorBanner } from './ErrorBanner.js';

interface BudgetFormProps {
  categoryId: string;
  month: string; // YYYY-MM
  initialLimitVnd: number | null;
  csrfToken: string;
  t: Copy;
  locale: Locale;
  onClose: () => void;
  onSuccess: () => void;
}

export function BudgetForm({
  categoryId,
  month,
  initialLimitVnd,
  csrfToken,
  t,
  locale,
  onClose,
  onSuccess,
}: BudgetFormProps) {
  const [limit, setLimit] = useState(initialLimitVnd ? initialLimitVnd.toString() : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiRequestError | string | null>(null);

  const title = locale === 'vi' ? 'Thiết lập ngân sách' : 'Set Budget';

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
        `/budgets/${categoryId}`,
        requestBody,
        {
          'X-CSRF-Token': csrfToken,
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

        <p style={{ marginBottom: 'var(--space-4)' }}>
          <strong>{locale === 'vi' ? 'Danh mục' : 'Category'}:</strong> {categoryId}
        </p>

        <label>
          {locale === 'vi' ? 'Giới hạn ngân sách (VND)' : 'Budget limit (VND)'}
          <input
            required
            inputMode="numeric"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            disabled={loading}
            placeholder="0"
          />
        </label>

        <button
          className="primary-button"
          type="submit"
          disabled={loading || !limit}
        >
          {loading ? t.loading : t.submit}
        </button>
      </form>
    </Modal>
  );
}
