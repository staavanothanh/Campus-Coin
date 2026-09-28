import { type FormEvent, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { apiRequest, errorMessage } from '../api.js';
import type { Budget, Copy, Locale } from '../types.js';
import { Modal } from './Modal.js';

type BudgetPayload = { month: string; limitVnd: number };

export function BudgetForm({ categoryId, categoryName, month, initialLimitVnd, csrfToken, t, locale, restoreFocusRef, onClose, onSuccess }: {
  categoryId: string; categoryName?: string; month: string; initialLimitVnd: number | null; csrfToken: string; t: Copy; locale: Locale; restoreFocusRef: React.RefObject<HTMLElement | null> | null; onClose(): void; onSuccess(): void;
}) {
  const [limit, setLimit] = useState(initialLimitVnd === null ? '' : String(initialLimitVnd));
  const [pending, setPending] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const [error, setError] = useState('');
  const limitInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(false);
  const retryPendingRef = useRef(false);
  const canClose = () => !pendingRef.current && !retryPendingRef.current;
  const key = useRef(crypto.randomUUID());
  const payload = useRef<BudgetPayload | null>(null);
  const title = locale === 'vi' ? 'Thiết lập ngân sách' : 'Set budget';

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pendingRef.current) return;
    const request = payload.current ?? (!/^\d+$/.test(limit) || !Number.isSafeInteger(Number(limit)) ? null : { month, limitVnd: Number(limit) });
    if (!request) {
      setError(t.validationError);
      return;
    }
    payload.current = request;
    pendingRef.current = true;
    retryPendingRef.current = true;
    setPending(true);
    setError('');
    try {
      await apiRequest<Budget>(`/budgets/${encodeURIComponent(categoryId)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, 'Idempotency-Key': key.current },
        body: JSON.stringify(request),
      });
      setRetryPending(false);
      retryPendingRef.current = false;
      onSuccess();
    } catch (caught) {
      const requestError = caught as Error & { status?: number };
      const isAmbiguous = requestError.status === undefined || requestError.status === 408 || requestError.status >= 500;
      retryPendingRef.current = isAmbiguous;
      setRetryPending(isAmbiguous);
      if (!isAmbiguous) {
        payload.current = null;
        key.current = crypto.randomUUID();
      }
      setError(errorMessage(caught, t));
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return <Modal isOpen onClose={() => { if (canClose()) onClose(); }} ariaLabel={title} initialFocusRef={limitInputRef} {...(restoreFocusRef ? { restoreFocusRef } : {})} canClose={canClose}><form className="modal-form" onSubmit={submit}>
    <div className="panel-heading"><h2>{title}</h2><button type="button" className="icon-button" onClick={() => { if (canClose()) onClose(); }} disabled={!canClose()} aria-label={t.close}><X size={18} aria-hidden="true" /></button></div>
    <p><strong>{t.category}:</strong> {categoryName ?? categoryId}</p><label htmlFor="budget-limit">{t.budgetLimit} (VND)<input ref={limitInputRef} id="budget-limit" required inputMode="numeric" value={limit} onChange={event => setLimit(event.target.value)} disabled={pending || retryPending} aria-invalid={Boolean(error || retryPending)} aria-describedby={error || retryPending ? 'budget-error-msg' : undefined} /></label>
    {(retryPending || error) && <p id="budget-error-msg" role="alert" className="form-message">{retryPending ? t.retryTransaction : error}</p>}
    <button type="submit" className="primary-button" disabled={pending}>{pending ? t.submitPending : retryPending ? t.retryTransaction : t.submit}</button>
  </form></Modal>;
}
