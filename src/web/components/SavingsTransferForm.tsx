import { useState, type FormEvent } from 'react';
import { apiPost, ApiRequestError } from '../api-client.js';
import { formatVnd, parseAmountVnd } from '../format.js';
import type { CreateSavingsTransferRequest, TransferDirection, Locale, SavingsTransfer } from '../types.js';
import type { Copy } from '../i18n.js';
import { Modal } from './Modal.js';
import { ErrorBanner } from './ErrorBanner.js';

interface SavingsTransferFormProps {
  direction: TransferDirection;
  csrfToken: string;
  t: Copy;
  locale: Locale;
  currentWalletVnd?: number;
  currentSavingsVnd?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function SavingsTransferForm({
  direction,
  csrfToken,
  t,
  locale,
  currentWalletVnd,
  currentSavingsVnd,
  onClose,
  onSuccess,
}: SavingsTransferFormProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiRequestError | string | null>(null);

  const title = direction === 'deposit' 
    ? (locale === 'vi' ? 'Gửi tiền vào tiết kiệm' : 'Deposit to savings') 
    : (locale === 'vi' ? 'Rút tiền từ tiết kiệm' : 'Withdraw from savings');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    
    setError(null);
    
    const amountVnd = parseAmountVnd(amount);
    if (amountVnd === null || amountVnd <= 0) {
      setError(t.amountInvalid);
      return;
    }

    if (direction === 'deposit' && currentWalletVnd !== undefined && amountVnd > currentWalletVnd) {
      setError(locale === 'vi' ? 'Số dư ví khả dụng không đủ để gửi vào quỹ tiết kiệm.' : 'Insufficient wallet balance for deposit.');
      return;
    }

    if (direction === 'withdraw' && currentSavingsVnd !== undefined && amountVnd > currentSavingsVnd) {
      setError(locale === 'vi' ? 'Số tiền rút vượt quá số dư trong quỹ tiết kiệm.' : 'Withdraw amount exceeds savings vault balance.');
      return;
    }

    setLoading(true);

    const requestBody: CreateSavingsTransferRequest = {
      direction,
      amountVnd,
      ...(note.trim() ? { note: note.trim() } : {}),
    };

    try {
      await apiPost<SavingsTransfer>(
        '/savings/transfers',
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

        {(direction === 'deposit' ? currentWalletVnd !== undefined : currentSavingsVnd !== undefined) && (
          <div className="transfer-hint-card">
            <span className="hint-label">
              {direction === 'deposit'
                ? (locale === 'vi' ? 'Tiền trong ví tổng khả dụng:' : 'Available in wallet:')
                : (locale === 'vi' ? 'Số dư quỹ tiết kiệm hiện có:' : 'Available in savings:')}
            </span>
            <div className="hint-value-row">
              <strong>
                {formatVnd(direction === 'deposit' ? currentWalletVnd : currentSavingsVnd, locale)}
              </strong>
              <button
                type="button"
                className="quick-max-btn"
                onClick={() => setAmount(String(direction === 'deposit' ? (currentWalletVnd ?? 0) : (currentSavingsVnd ?? 0)))}
              >
                {locale === 'vi' ? 'Tối đa' : 'Max'}
              </button>
            </div>
          </div>
        )}

        <label>
          {t.amount}
          <input
            required
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
            placeholder="0"
          />
        </label>

        <label>
          Ghi chú
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
            maxLength={255}
          />
        </label>

        <button
          className="primary-button"
          type="submit"
          disabled={loading || !amount}
        >
          {loading ? t.loading : t.submit}
        </button>
      </form>
    </Modal>
  );
}
