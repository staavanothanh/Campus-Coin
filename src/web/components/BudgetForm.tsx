import { type FormEvent, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { apiRequest, errorMessage } from '../api.js';
import type { Budget, Copy, Locale } from '../types.js';
import { Modal } from './Modal.js';

type BudgetPayload = { month: string; limitVnd: number };

export function BudgetForm({ categoryId, month, initialLimitVnd, csrfToken, t, locale, onClose, onSuccess }: {
  categoryId: string; month: string; initialLimitVnd: number | null; csrfToken: string; t: Copy; locale: Locale; onClose(): void; onSuccess(): void;
}) {
  const [limit, setLimit] = useState(initialLimitVnd === null ? '' : String(initialLimitVnd));
  const [pending, setPending] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const [error, setError] = useState('');
  const key = useRef(crypto.randomUUID());
  const payload = useRef<BudgetPayload | null>(null);
  const title = locale === 'vi' ? 'Thiết lập ngân sách' : 'Set budget';

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const request = payload.current ?? (!/^\d+$/.test(limit) || !Number.isSafeInteger(Number(limit)) ? null : { month, limitVnd: Number(limit) });
    if (!request) {
      setError(t.validationError);
      return;
    }
    payload.current = request;
    setPending(true);
    setError('');
    try {
      await apiRequest<Budget>(`/budgets/${encodeURIComponent(categoryId)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, 'Idempotency-Key': key.current },
        body: JSON.stringify(request),
      });
      setRetryPending(false);
      onSuccess();
    } catch (caught) {
      const requestError = caught as Error & { status?: number };
      const isAmbiguous = requestError.status === undefined || requestError.status === 408 || requestError.status >= 500;
      setRetryPending(isAmbiguous);
      if (!isAmbiguous) {
        payload.current = null;
        key.current = crypto.randomUUID();
      }
      setError(errorMessage(caught, t));
    } finally {
      setPending(false);
    }
  }

  return <Modal isOpen onClose={onClose} ariaLabel={title}><form className="modal-form" onSubmit={submit}>
    <div className="panel-heading"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} disabled={pending || retryPending} aria-label={t.close}><X size={18} /></button></div>
    <p><strong>{t.category}:</strong> {categoryId}</p><label htmlFor="budget-limit">{t.budgetLimit} (VND)<input id="budget-limit" required inputMode="numeric" value={limit} onChange={event => setLimit(event.target.value)} disabled={pending || retryPending} /></label>
    {retryPending && <p role="alert" className="form-message">{t.retryTransaction}</p>}
    <button type="submit" className="primary-button" disabled={pending}>{pending ? t.submitPending : retryPending ? t.retryTransaction : t.submit}</button>{error && <p role="alert" className="form-message">{error}</p>}
  </form></Modal>;
}
