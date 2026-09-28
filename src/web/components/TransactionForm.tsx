import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { apiPost, ApiRequestError } from '../api-client.js';
import { parseAmountVnd, formatVnd } from '../format.js';
import type {
  CategorySuggestion,
  CreateTransactionRequest,
  TransactionWithWarning,
  TransactionType,
  Locale,
  BudgetWarning,
} from '../types.js';
import type { Copy } from '../i18n.js';
import { Modal } from './Modal.js';
import { CategorySelect } from './CategorySelect.js';
import { ErrorBanner } from './ErrorBanner.js';
import { BudgetWarningBanner } from './BudgetWarningBanner.js';
import {
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Save,
  Tag,
  Coins
} from 'lucide-react';
import { invalidateCategoriesCache } from '../hooks/use-categories.js';
import { isApplicableCategorySuggestion } from '../jev-suggestion.js';
import { useFormattedAmountInput } from '../hooks/use-formatted-amount-input.js';
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
  const { rawValue: amount, setRawValue: setAmount, formattedValue: formattedAmount, inputRef: amountInputRef, handleChange: handleAmountChange } = useFormattedAmountInput('', locale);
  const [categoryId, setCategoryId] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState(false);
  const categoryManuallySelectedRef = useRef(false);
  const [availableCategoryIds, setAvailableCategoryIds] = useState<string[]>([]);
  const [acceptedSuggestionCategoryId, setAcceptedSuggestionCategoryId] = useState<string | null>(null);
  const suggestionRequestRef = useRef(0);
  const descriptionRequestRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiRequestError | string | null>(null);
  const [budgetWarning, setBudgetWarning] = useState<BudgetWarning | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const availableCategoryIdsKey = availableCategoryIds.join('|');

  const handleAvailableCategoryIdsChange = useCallback((categoryIds: string[]) => {
    setAvailableCategoryIds(categoryIds);
  }, []);
  function invalidateSuggestionRequest() {
    suggestionRequestRef.current += 1;
    if (descriptionRequestRef.current !== null) {
      window.clearTimeout(descriptionRequestRef.current);
      descriptionRequestRef.current = null;
    }
  }

  useEffect(() => {
    const trimmedDescription = description.trim();
    const requestId = suggestionRequestRef.current + 1;
    suggestionRequestRef.current = requestId;
    if (descriptionRequestRef.current !== null) window.clearTimeout(descriptionRequestRef.current);

    setSuggestion(null);
    setSuggestionError(false);
    setSuggestionLoading(trimmedDescription.length > 0);
    if (!trimmedDescription) {
      setSuggestionLoading(false);
      return;
    }

    descriptionRequestRef.current = window.setTimeout(() => {
      void apiPost<CategorySuggestion>('/ai/category-suggestion', {
        transactionType: currentType,
        description: trimmedDescription,
        locale,
      }, { 'X-CSRF-Token': csrfToken })
        .then(result => {
          if (suggestionRequestRef.current !== requestId) return;
          setSuggestion(result);
          setSuggestionLoading(false);
          if (!categoryManuallySelectedRef.current && isApplicableCategorySuggestion(result, false, availableCategoryIds)) {
            setCategoryId(result.categoryId);
            setAcceptedSuggestionCategoryId(result.categoryId);
            setIsOtherSelected(false);
            setCustomCategoryName('');
          }
        })
        .catch(() => {
          if (suggestionRequestRef.current !== requestId) return;
          setSuggestion(null);
          setSuggestionError(true);
          setSuggestionLoading(false);
        });
    }, 450);

    return () => {
      if (descriptionRequestRef.current !== null) window.clearTimeout(descriptionRequestRef.current);
    };
  }, [availableCategoryIdsKey, csrfToken, currentType, description, locale]);
  function handleAddQuickAmount(addVal: number) {
    const currentAmount = BigInt(amount || '0');
    const nextAmount = currentAmount + BigInt(addVal);
    if (nextAmount > BigInt(Number.MAX_SAFE_INTEGER)) return;
    setAmount(nextAmount.toString());
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
      ...(acceptedSuggestionCategoryId === finalCategoryId ? { confirmedCategorySuggestion: true } : {}),
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
                invalidateSuggestionRequest();
                categoryManuallySelectedRef.current = false;
                setCurrentType('payment');
                setCategoryId('');
                setIsOtherSelected(false);
                setCustomCategoryName('');
                setAcceptedSuggestionCategoryId(null);
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
                invalidateSuggestionRequest();
                categoryManuallySelectedRef.current = false;
                setCurrentType('income');
                setCategoryId('');
                setIsOtherSelected(false);
                setCustomCategoryName('');
                setAcceptedSuggestionCategoryId(null);
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
                ref={amountInputRef}
                id="tx-amount"
                required
                autoFocus
                inputMode="numeric"
                value={formattedAmount}
                onChange={handleAmountChange}
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

          {/* Description drives the optional automatic JEV classification. */}
          <div className="form-field-wrapper">
            <label htmlFor="tx-desc">
              {t.description}
            </label>
            <input
              id="tx-desc"
              type="text"
              value={description}
              onChange={e => {
                invalidateSuggestionRequest();
                categoryManuallySelectedRef.current = false;
                setDescription(e.target.value);
              }}
              disabled={loading}
              maxLength={255}
              placeholder={isVi ? 'Ví dụ: Cơm trưa căng tin, giáo trình...' : 'e.g. Lunch, books...'}
              aria-describedby="jev-suggestion-status"
            />
            <div id="jev-suggestion-status" className="jev-suggestion-status" role="status" aria-live="polite" aria-atomic="true">
              {suggestionLoading && t.suggestionLoading}
              {!suggestionLoading && suggestion?.status === 'suggested' && t.suggestionSuggested}
              {!suggestionLoading && suggestion?.status === 'manual' && t.suggestionManual}
              {!suggestionLoading && (suggestion?.status === 'disabled' || suggestion?.status === 'unavailable') && t.suggestionUnavailable}
              {!suggestionLoading && suggestionError && t.suggestionError}
            </div>
          </div>

          {/* Category Select */}
          <div className="form-field-wrapper">
            <CategorySelect
              appliesTo={currentType}
              value={categoryId}
              onChange={(nextCategoryId) => {
                invalidateSuggestionRequest();
                categoryManuallySelectedRef.current = true;
                setCategoryId(nextCategoryId);
                setAcceptedSuggestionCategoryId(null);
              }}
              onOtherChange={(isOther) => {
                setIsOtherSelected(isOther);
                if (!isOther) setCustomCategoryName('');
              }}
              onAvailableCategoryIdsChange={handleAvailableCategoryIdsChange}
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
