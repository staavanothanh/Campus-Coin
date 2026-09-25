import { useState, type FormEvent } from 'react';
import { apiPost, ApiRequestError } from '../api-client.js';
import { parseAmountVnd } from '../format.js';
import type { CreateTransactionRequest, TransactionWithWarning, TransactionType, Locale, BudgetWarning } from '../types.js';
import type { Copy } from '../i18n.js';
import { Modal } from './Modal.js';
import { CategorySelect } from './CategorySelect.js';
import { ErrorBanner } from './ErrorBanner.js';
import { BudgetWarningBanner } from './BudgetWarningBanner.js';

interface TransactionFormProps {
  kind: TransactionType;
  csrfToken: string;
  t: Copy;
  locale: Locale;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransactionForm({
  kind,
  csrfToken,
  t,
  locale,
  onClose,
  onSuccess,
}: TransactionFormProps) {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiRequestError | string | null>(null);
  const [budgetWarning, setBudgetWarning] = useState<BudgetWarning | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const title = kind === 'income' ? t.addIncome : t.addPayment;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading || isSuccess) return;
    
    setError(null);
    
    const amountVnd = parseAmountVnd(amount);
    if (amountVnd === null) {
      setError(t.amountInvalid);
      return;
    }

    if (!categoryId) {
      setError(t.validationFailed);
      return;
    }

    setLoading(true);

    const requestBody: CreateTransactionRequest = {
      type: kind,
      amountVnd,
      categoryId,
      occurredAt: new Date().toISOString(),
      ...(description.trim() ? { description: description.trim() } : {}),
    };

    try {
      const response = await apiPost<TransactionWithWarning>(
        '/ledger/transactions',
        requestBody,
        {
          'X-CSRF-Token': csrfToken,
          'Idempotency-Key': crypto.randomUUID(),
        }
      );

      setIsSuccess(true);
      if (response.budgetWarning?.isOverrun) {
        setBudgetWarning(response.budgetWarning);
      } else {
        // If no warning, just close and refresh immediately
        onSuccess();
        onClose();
      }
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

  function handleCloseSuccess() {
    onSuccess();
    onClose();
  }

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel={title}>
      {isSuccess && budgetWarning ? (
        <div className="transaction-success-view">
          <div className="panel-heading">
            <h2>{t.transactionSaved}</h2>
          </div>
          <BudgetWarningBanner warning={budgetWarning} locale={locale} />
          <button className="primary-button" onClick={handleCloseSuccess}>
            {t.close}
          </button>
        </div>
      ) : (
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

          <CategorySelect
            appliesTo={kind}
            value={categoryId}
            onChange={setCategoryId}
            locale={locale}
            label={t.category}
            placeholder={t.selectCategory}
            disabled={loading}
          />

          <label>
            {t.description}
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              maxLength={255}
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={loading || !amount || !categoryId}
          >
            {loading ? t.loading : t.submit}
          </button>
        </form>
      )}
    </Modal>
  );
}
