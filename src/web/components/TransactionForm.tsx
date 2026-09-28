import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiPost, ApiRequestError } from '../api-client.js';
import { parseAmountVnd, formatVnd } from '../format.js';
import type {
  CreateTransactionRequest,
  TransactionWithWarning,
  TransactionType,
  Locale,
  BudgetWarning,
  CategorySuggestion
} from '../types.js';
import type { Copy } from '../i18n.js';
import { Modal } from './Modal.js';
import { CategorySelect } from './CategorySelect.js';
import { ErrorBanner } from './ErrorBanner.js';
import { BudgetWarningBanner } from './BudgetWarningBanner.js';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  X,
  Save,
  Tag,
  FileText,
  Coins
} from 'lucide-react';
import { invalidateCategoriesCache } from '../hooks/use-categories.js';

interface TransactionFormProps {
  kind: TransactionType;
  csrfToken: string;
  t: Copy;
  locale: Locale;
  onClose: () => void;
  onSuccess: () => void;
  onInitWalletRequired?: () => void;
}

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000, 500000];

export function TransactionForm({
  kind: initialKind,
  csrfToken,
  t,
  locale,
  onClose,
  onSuccess,
  onInitWalletRequired,
}: TransactionFormProps) {
  const isVi = locale === 'vi';
  const [currentType, setCurrentType] = useState<TransactionType>(initialKind);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiRequestError | string | null>(null);
  const [budgetWarning, setBudgetWarning] = useState<BudgetWarning | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState(false);
  const [acceptedSuggestionId, setAcceptedSuggestionId] = useState<string | null>(null);
  const suggestionSeq = useRef(0);

  async function requestCategorySuggestion(silent = false) {
    const trimmed = description.trim();
    if (!trimmed) return;
    const seq = ++suggestionSeq.current;
    setSuggestionLoading(true);
    setSuggestion(null);
    if (!silent) setSuggestionError(false);
    setAcceptedSuggestionId(null);
    try {
      const result = await apiPost<CategorySuggestion>('/ai/category-suggestion', {
        transactionType: currentType,
        description: trimmed,
        locale,
      }, { 'X-CSRF-Token': csrfToken });
      if (seq !== suggestionSeq.current) return;
      setSuggestion(result);
    } catch {
      if (seq !== suggestionSeq.current) return;
      if (!silent) setSuggestionError(true);
    } finally {
      if (seq === suggestionSeq.current) setSuggestionLoading(false);
    }
  }

  // Auto-suggest (debounced) while the user types a description; silent on
  // non-"suggested" outcomes so typing never spams the manual picker.
  useEffect(() => {
    suggestionSeq.current += 1;
    setSuggestionLoading(false);
    if (description.trim().length < 2) {
      setSuggestion(null);
      setSuggestionError(false);
      setAcceptedSuggestionId(null);
      return;
    }
    const timer = setTimeout(() => {
      void requestCategorySuggestion(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [description, currentType, locale]);

  function handleAddQuickAmount(addVal: number) {
    const currentNum = parseInt(amount.replace(/\D/g, ''), 10) || 0;
    const nextVal = currentNum + addVal;
    setAmount(String(nextVal));
  }

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

    if (isOtherSelected && !customCategoryName.trim()) {
      setError(isVi ? 'Vui lòng nhập tên danh mục khác' : 'Please enter custom category name');
      return;
    }

    setLoading(true);

    let finalCategoryId = categoryId;

    if (isOtherSelected && customCategoryName.trim()) {
      const cleanName = customCategoryName.trim();
      try {
        const newCat = await apiPost<{ id: string | number }>(
          '/categories',
          {
            nameEn: cleanName,
            nameVi: cleanName,
            appliesTo: currentType,
          },
          {
            'X-CSRF-Token': csrfToken,
            'Idempotency-Key': crypto.randomUUID(),
          }
        );
        if (!newCat || !newCat.id) {
          setError(t.categoryCreateFailed);
          setLoading(false);
          return;
        }
        finalCategoryId = String(newCat.id);
        invalidateCategoriesCache();
      } catch {
        setError(t.categoryCreateFailed);
        setLoading(false);
        return;
      }
    } else if (finalCategoryId.startsWith('preset:')) {
      const [, pEn, pVi] = finalCategoryId.split(':');
      try {
        const newCat = await apiPost<{ id: string | number }>(
          '/categories',
          {
            nameEn: pEn || 'Other',
            nameVi: pVi || pEn || 'Khác',
            appliesTo: currentType,
          },
          {
            'X-CSRF-Token': csrfToken,
            'Idempotency-Key': crypto.randomUUID(),
          }
        );
        if (!newCat || !newCat.id) {
          setError(t.categoryCreateFailed);
          setLoading(false);
          return;
        }
        finalCategoryId = String(newCat.id);
        invalidateCategoriesCache();
      } catch {
        setError(t.categoryCreateFailed);
        setLoading(false);
        return;
      }
    } else if (finalCategoryId === 'other') {
      finalCategoryId = currentType === 'income' ? '4' : '11';
    }

    let finalDescription = description.trim();
    if (isOtherSelected && customCategoryName.trim() && (finalCategoryId === '4' || finalCategoryId === '11')) {
      finalDescription = finalDescription
        ? `[${customCategoryName.trim()}] ${finalDescription}`
        : customCategoryName.trim();
    }

    const requestBody: CreateTransactionRequest = {
      type: currentType,
      amountVnd,
      categoryId: finalCategoryId,
      occurredAt: new Date().toISOString(),
      ...(finalDescription ? { description: finalDescription } : {}),
      ...(acceptedSuggestionId !== null && acceptedSuggestionId === finalCategoryId
        ? { confirmedCategorySuggestion: true }
        : {}),
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

  const modalTitle = currentType === 'income' ? t.addIncome : t.addPayment;

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel={modalTitle}>
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
        <form onSubmit={submit} className="transaction-modal-form">
          <div className="modal-header-row">
            <h3>{modalTitle}</h3>
            <button
              type="button"
              className="icon-button modal-close-btn"
              onClick={onClose}
              aria-label={t.close}
            >
              <X size={18} />
            </button>
          </div>

          {/* Segmented Type Toggle */}
          <div className="type-toggle-switch">
            <button
              type="button"
              className={`toggle-option ${currentType === 'payment' ? 'active-payment' : ''}`}
              onClick={() => {
                setCurrentType('payment');
                setCategoryId('');
                setIsOtherSelected(false);
                setCustomCategoryName('');
                setAcceptedSuggestionId(null);
                setSuggestion(null);
              }}
            >
              <ArrowUpRight size={16} />
              <span>{isVi ? 'Khoản chi' : 'Expense'}</span>
            </button>
            <button
              type="button"
              className={`toggle-option ${currentType === 'income' ? 'active-income' : ''}`}
              onClick={() => {
                setCurrentType('income');
                setCategoryId('');
                setIsOtherSelected(false);
                setCustomCategoryName('');
                setAcceptedSuggestionId(null);
                setSuggestion(null);
              }}
            >
              <ArrowDownLeft size={16} />
              <span>{isVi ? 'Khoản thu' : 'Income'}</span>
            </button>
          </div>

          <ErrorBanner
            error={error instanceof ApiRequestError ? error.apiError : error}
            locale={locale}
          />

          {onInitWalletRequired && (
            (error instanceof ApiRequestError && error.apiError?.code === 'WALLET_NOT_INITIALIZED') ||
            (typeof error === 'string' && error.toLowerCase().includes('wallet not initialized'))
          ) && (
            <button
              type="button"
              className="primary-button"
              onClick={onInitWalletRequired}
              style={{
                padding: '9px 16px',
                fontSize: 12,
                width: '100%',
                justifyContent: 'center',
                margin: '2px 0 10px 0',
              }}
            >
              <Coins size={15} />
              {isVi ? 'Thiết lập số dư ví ngay' : 'Initialize Wallet Now'}
            </button>
          )}

          {/* Amount Input */}
          <div className="form-field-wrapper">
            <label htmlFor="tx-amount">
              {t.amount} <span className="req-dot">*</span>
            </label>
            <div className="amount-input-box">
              <span className="currency-prefix">₫</span>
              <input
                id="tx-amount"
                required
                autoFocus
                inputMode="numeric"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
                placeholder="0"
                className="amount-input"
              />
            </div>

            {/* Quick Amount Suggestion Chips */}
            <div className="quick-amount-chips">
              {QUICK_AMOUNTS.map(val => (
                <button
                  key={val}
                  type="button"
                  className="quick-chip"
                  onClick={() => handleAddQuickAmount(val)}
                  disabled={loading}
                >
                  +{val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
            </div>
          </div>

          {/* Category Select */}
          <div className="form-field-wrapper">
            <CategorySelect
              appliesTo={currentType}
              value={categoryId}
              onChange={(nextCategoryId) => {
                setCategoryId(nextCategoryId);
                if (nextCategoryId !== acceptedSuggestionId) setAcceptedSuggestionId(null);
              }}
              onOtherChange={(isOther) => {
                setIsOtherSelected(isOther);
                if (!isOther) setCustomCategoryName('');
              }}
              locale={locale}
              label={t.category}
              placeholder={t.selectCategory}
              disabled={loading}
            />
          </div>

          {/* Custom Category Input if "Khác" is selected */}
          {isOtherSelected && (
            <div className="form-field-wrapper custom-category-field animate-fade-in">
              <label htmlFor="tx-custom-category">
                {isVi ? 'Tên danh mục khác' : 'Custom category name'} <span className="req-dot">*</span>
              </label>
              <div className="input-with-icon">
                <Tag size={16} className="field-icon" />
                <input
                  id="tx-custom-category"
                  type="text"
                  required
                  value={customCategoryName}
                  onChange={e => setCustomCategoryName(e.target.value)}
                  disabled={loading}
                  maxLength={60}
                  autoFocus
                  placeholder={isVi ? 'Nhập tên danh mục khác (ví dụ: Sửa xe, Gym, Giáo trình...)' : 'Enter custom category name...'}
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="form-field-wrapper">
            <label htmlFor="tx-desc">
              {t.description}
            </label>
            <input
              id="tx-desc"
              type="text"
              value={description}
              onChange={e => {
                setDescription(e.target.value);
                setAcceptedSuggestionId(null);
                setSuggestion(null);
              }}
              disabled={loading}
              maxLength={255}
              placeholder={isVi ? 'Ví dụ: Cơm trưa căng tin, giáo trình...' : 'e.g. Lunch, books...'}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={() => void requestCategorySuggestion()}
              disabled={loading || suggestionLoading || !description.trim()}
              style={{ marginTop: 8 }}
            >
              {suggestionLoading ? t.suggestionLoading : t.suggestCategory}
            </button>
            {suggestionError && <p role="status" className="muted">{t.suggestionFailed}</p>}
            {suggestion?.status === 'disabled' && <p role="status" className="muted">{t.suggestionDisabled}</p>}
            {suggestion?.status === 'unavailable' && <p role="status" className="muted">{t.suggestionUnavailable}</p>}
            {suggestion?.status === 'manual' && <p role="status" className="muted">{t.suggestionManual}</p>}
            {suggestion?.status === 'suggested' && suggestion.categoryId && (
              <div role="status" className="muted">
                <p>{t.suggestionAvailable}</p>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={loading}
                  onClick={() => {
                    const suggestedId = suggestion.categoryId;
                    if (suggestedId === null) return;
                    setCategoryId(suggestedId);
                    setIsOtherSelected(false);
                    setCustomCategoryName('');
                    setAcceptedSuggestionId(suggestedId);
                    setError(null);
                  }}
                >
                  {t.suggestionUse}
                </button>
                {acceptedSuggestionId === suggestion.categoryId && <p>{t.suggestionConfirm}</p>}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="modal-actions-row">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={loading}
            >
              {t.close}
            </button>

            <button
              className="primary-button"
              type="submit"
              disabled={loading || !amount || !categoryId || (isOtherSelected && !customCategoryName.trim())}
            >
              <Save size={16} />
              <span>{loading ? t.loading : t.submit}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
