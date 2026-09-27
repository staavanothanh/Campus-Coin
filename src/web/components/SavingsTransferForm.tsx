import { type FormEvent, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { apiRequest, errorMessage } from '../api.js';
import { parseAmountVnd } from '../format.js';
import type { Copy, Locale, SavingsTransfer } from '../types.js';
import { Modal } from './Modal.js';

type SavingsTransferPayload = { direction: 'deposit' | 'withdraw'; amountVnd: number; note?: string };

export function SavingsTransferForm({ direction, csrfToken, t, locale, onClose, onSuccess }: {
  direction: 'deposit' | 'withdraw'; csrfToken: string; t: Copy; locale: Locale; onClose(): void; onSuccess(): void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const key = useRef(crypto.randomUUID());
  const payload = useRef<SavingsTransferPayload | null>(null);
  const title = direction === 'deposit' ? t.deposit : t.withdraw;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const amountVnd = parseAmountVnd(amount);
    const request = payload.current ?? (amountVnd === null || note.length > 500 ? null : { direction, amountVnd, ...(note.trim() ? { note: note.trim() } : {}) });
    if (!request) {
      setError(t.validationError);
      return;
    }
    payload.current = request;
    setPending(true);
    setError('');
    try {
      await apiRequest<SavingsTransfer>('/savings/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, 'Idempotency-Key': key.current },
        body: JSON.stringify(request),
      });
      setRetryPending(false);
      onSuccess();
      onClose();
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

  return <Modal isOpen onClose={onClose} ariaLabel={title}>
    <form className="modal-form" onSubmit={submit}>
      <div className="panel-heading"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} disabled={pending || retryPending} aria-label={t.close}><X size={18} /></button></div>
      <label htmlFor="savings-amount">{t.amount}<input id="savings-amount" required inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} disabled={pending || retryPending} /></label>
      <label htmlFor="savings-note">{t.transferNote}<input id="savings-note" maxLength={500} value={note} onChange={event => setNote(event.target.value)} disabled={pending || retryPending} /></label>
      {retryPending && <p className="form-message" role="alert">{t.retryTransaction}</p>}
      <button className="primary-button" type="submit" disabled={pending}>{pending ? t.submitPending : retryPending ? t.retryTransaction : t.submit}</button>
      {error && <p className="form-message" role="alert">{error}</p>}
    </form>
  </Modal>;
}
