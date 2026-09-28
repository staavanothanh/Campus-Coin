import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiGet, apiPost, ApiRequestError } from '../api-client.js';
import { parseAmountVnd, formatVnd } from '../format.js';
import type {
  CreateTransactionRequest,
  FrequentPaymentItems,
  TransactionWithWarning,
  TransactionType,
  Locale,
  BudgetWarning,
  ReceiptDraft,
  CategorySuggestion,
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
  Coins,
  Camera,
  Sparkles,
} from 'lucide-react';
import { invalidateCategoriesCache } from '../hooks/use-categories.js';
import { findFrequentPaymentItem, hcmcCalendarDayDifference, purchaseIntervalChange } from '../item-history.js';
import { hcmcDateToIsoInstant, todayInHcmc } from '../transaction-date.js';

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
const MAX_RECEIPT_BYTES = 2_200_000;

async function receiptImageBase64(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 12_000_000) {
    throw new Error('RECEIPT_FILE_INVALID');
  }

  const image = await createImageBitmap(file);
  try {
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('RECEIPT_IMAGE_PROCESSING_FAILED');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.82, 0.68, 0.54]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (!blob) throw new Error('RECEIPT_IMAGE_PROCESSING_FAILED');
      if (blob.size <= MAX_RECEIPT_BYTES) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error());
          reader.onerror = () => reject(new Error());
          reader.readAsDataURL(blob);
        });
        const encoded = dataUrl.split(',')[1];
        if (!encoded) throw new Error('RECEIPT_IMAGE_PROCESSING_FAILED');
        return encoded;
      }
    }
    throw new Error('RECEIPT_IMAGE_TOO_LARGE');
  } finally {
    image.close();
  }
}

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
  const [occurredOn, setOccurredOn] = useState(() => todayInHcmc());
  const [categoryId, setCategoryId] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemSuggestionsOpen, setItemSuggestionsOpen] = useState(false);
  const [itemSuggestions, setItemSuggestions] = useState<FrequentPaymentItems['items']>([]);
  const [itemSuggestionsLoading, setItemSuggestionsLoading] = useState(false);
  const [itemSuggestionsLoaded, setItemSuggestionsLoaded] = useState(false);
  const [itemSuggestionsFailed, setItemSuggestionsFailed] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptConsent, setReceiptConsent] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptMessage, setReceiptMessage] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [categoryConsent, setCategoryConsent] = useState(false);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiRequestError | string | null>(null);
  const [budgetWarning, setBudgetWarning] = useState<BudgetWarning | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedTransaction, setSavedTransaction] = useState<{
    type: TransactionType;
    amountVnd: number;
    description: string;
    itemName: string;
  } | null>(null);
  const categoryRequestRef = useRef<{ signature: string; key: string } | null>(null);
  const transactionRequestRef = useRef<{
    signature: string;
    key: string;
    body: CreateTransactionRequest;
  } | null>(null);

  useEffect(() => {
    if (currentType !== 'payment') {
      setItemSuggestionsLoading(false);
      setItemSuggestionsLoaded(false);
      setItemSuggestionsFailed(false);
      return;
    }

      let isCurrent = true;
    setItemSuggestions([]);
    setItemSuggestionsLoading(true);
    setItemSuggestionsLoaded(false);
    setItemSuggestionsFailed(false);
    void apiGet<FrequentPaymentItems>('/ledger/item-suggestions')
      .then((result) => {
        if (!isCurrent) return;
        setItemSuggestions(result.items.slice(0, 10));
      })
      .catch(() => {
        if (!isCurrent) return;
        setItemSuggestions([]);
        setItemSuggestionsFailed(true);
      })
      .finally(() => {
        if (isCurrent) {
          setItemSuggestionsLoading(false);
          setItemSuggestionsLoaded(true);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [currentType]);

  const matchedItem = currentType === 'payment' ? findFrequentPaymentItem(itemName, itemSuggestions) : null;
  const providerBusy = receiptBusy || categoryBusy;
  const currentAmountVnd = parseAmountVnd(amount);
  const today = todayInHcmc();
  const occurredAt = hcmcDateToIsoInstant(occurredOn);
  const currentPurchaseInterval = matchedItem !== null && occurredAt !== null
    ? hcmcCalendarDayDifference(matchedItem.lastOccurredAt, occurredAt)
    : null;
  const previousPurchaseInterval = matchedItem?.previousOccurredAt
    ? hcmcCalendarDayDifference(matchedItem.previousOccurredAt, matchedItem.lastOccurredAt)
    : null;
  const purchaseIntervalDifference = purchaseIntervalChange(previousPurchaseInterval, currentPurchaseInterval);
  let purchaseIntervalMessage: string | null = null;
  if (purchaseIntervalDifference !== null && purchaseIntervalDifference < 0) {
    purchaseIntervalMessage = t.itemHistoryIntervalShorter.replace('{days}', String(Math.abs(purchaseIntervalDifference)));
  } else if (purchaseIntervalDifference !== null && purchaseIntervalDifference > 0) {
    purchaseIntervalMessage = t.itemHistoryIntervalLonger.replace('{days}', String(purchaseIntervalDifference));
  } else if (purchaseIntervalDifference === 0) {
    purchaseIntervalMessage = t.itemHistoryIntervalSame;
  }

  function categoryKey(body: object): string {
    const signature = JSON.stringify(body);
    if (categoryRequestRef.current?.signature !== signature) {
      categoryRequestRef.current = { signature, key: crypto.randomUUID() };
    }
    return categoryRequestRef.current.key;
  }

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

    if (occurredAt === null || occurredOn > todayInHcmc()) {
      setError(t.transactionDateInvalid);
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
        const categoryBody = {
          nameEn: cleanName,
          nameVi: cleanName,
          appliesTo: currentType,
        };
        const newCat = await apiPost<{ id: string | number }>(
          '/categories',
          categoryBody,
          {
            'X-CSRF-Token': csrfToken,
            'Idempotency-Key': categoryKey(categoryBody),
          }
        );
        if (newCat && newCat.id) {
          finalCategoryId = String(newCat.id);
          invalidateCategoriesCache();
        }
      } catch (err) {
        setError(err instanceof ApiRequestError ? err : t.serverError);
        setLoading(false);
        return;
      }
    } else if (finalCategoryId.startsWith('preset:')) {
      const [, pEn, pVi] = finalCategoryId.split(':');
      try {
        const categoryBody = {
          nameEn: pEn || 'Other',
          nameVi: pVi || pEn || 'Khác',
          appliesTo: currentType,
        };
        const newCat = await apiPost<{ id: string | number }>(
          '/categories',
          categoryBody,
          {
            'X-CSRF-Token': csrfToken,
            'Idempotency-Key': categoryKey(categoryBody),
          }
        );
        if (newCat && newCat.id) {
          finalCategoryId = String(newCat.id);
          invalidateCategoriesCache();
        }
      } catch (err) {
        setError(err instanceof ApiRequestError ? err : t.serverError);
        setLoading(false);
        return;
      }
    } else if (finalCategoryId === 'other') {
      setError(isVi ? 'Vui lòng chọn danh mục hợp lệ.' : 'Please choose a valid category.');
      setLoading(false);
      return;
    }

    let finalDescription = description.trim();
    if (isOtherSelected && customCategoryName.trim() && (finalCategoryId === '4' || finalCategoryId === '11')) {
      finalDescription = finalDescription
        ? `[${customCategoryName.trim()}] ${finalDescription}`
        : customCategoryName.trim();
    }

    const requestSignature = JSON.stringify({
      type: currentType,
      amountVnd,
      categoryId: finalCategoryId,
      occurredOn,
      description: finalDescription,
      itemName: currentType === 'payment' ? itemName.trim() : '',
    });
    if (transactionRequestRef.current?.signature !== requestSignature) {
      transactionRequestRef.current = {
        signature: requestSignature,
        key: crypto.randomUUID(),
        body: {
          type: currentType,
          amountVnd,
          categoryId: finalCategoryId,
          occurredAt,
          ...(finalDescription ? { description: finalDescription } : {}),
          ...(currentType === 'payment' && itemName.trim() ? { itemName: itemName.trim() } : {}),
        },
      };
    }
    const requestBody = transactionRequestRef.current.body;

    try {
      const response = await apiPost<TransactionWithWarning>(
        '/ledger/transactions',
        requestBody,
        {
          'X-CSRF-Token': csrfToken,
          'Idempotency-Key': transactionRequestRef.current.key,
        }
      );

      setSavedTransaction({
        type: currentType,
        amountVnd,
        description: finalDescription,
        itemName: currentType === 'payment' ? itemName.trim() : '',
      });
      setBudgetWarning(response.budgetWarning?.isOverrun ? response.budgetWarning : null);
      setIsSuccess(true);
      onSuccess();
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
    onClose();
  }

  async function readReceipt() {
    if (!receiptFile || receiptBusy || loading) return;
    setReceiptError('');
    setReceiptMessage('');
    if (!receiptConsent) {
      setReceiptError(isVi
        ? 'Hãy đồng ý gửi ảnh đã chọn tới Google Cloud Vision trước khi đọc.'
        : 'Consent to send the selected image to Google Cloud Vision before reading it.');
      return;
    }
    setReceiptBusy(true);
    try {
      const imageBase64 = await receiptImageBase64(receiptFile);
      const result = await apiPost<ReceiptDraft>('/receipts/parse', {
        imageBase64,
        mimeType: 'image/jpeg',
        providerConsent: true,
      }, { 'X-CSRF-Token': csrfToken });
      if (result.amountVnd !== null && !amount.trim()) setAmount(String(result.amountVnd));
      if (result.description && !description.trim()) setDescription(result.description);
      setReceiptMessage(result.amountVnd === null
        ? (isVi ? 'Đã đọc ảnh nhưng chưa nhận ra tổng tiền. Hãy kiểm tra và nhập lại nếu cần.' : 'The image was read, but no total was recognized. Check it and enter the amount if needed.')
        : (isVi ? 'Đã điền bản nháp. Hãy kiểm tra số tiền và mô tả trước khi lưu.' : 'Draft fields are filled. Review the amount and description before saving.'));
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'RECEIPT_FILE_INVALID') {
        setReceiptError(isVi ? 'Chọn ảnh JPEG hoặc PNG nhỏ hơn 12 MB.' : 'Choose a JPEG or PNG image smaller than 12 MB.');
      } else if (caught instanceof Error && caught.message === 'RECEIPT_IMAGE_TOO_LARGE') {
        setReceiptError(isVi ? 'Ảnh vẫn quá lớn sau khi thu nhỏ. Hãy chọn ảnh khác.' : 'The image is still too large after resizing. Choose another image.');
      } else if (caught instanceof ApiRequestError && caught.apiError?.code === 'OCR_UNAVAILABLE') {
        setReceiptError(isVi ? 'OCR chưa được bật trên máy chủ. Bạn vẫn có thể nhập giao dịch bằng tay.' : 'Receipt reading is not enabled on the server. You can still enter the transaction manually.');
      } else if (caught instanceof ApiRequestError && caught.isRateLimited) {
        setReceiptError(isVi ? 'Bạn đã dùng hết lượt đọc hóa đơn trong lúc này. Hãy thử lại sau.' : 'The receipt reading limit was reached. Try again later.');
      } else {
        setReceiptError(isVi ? 'Chưa đọc được ảnh. Hãy kiểm tra lại hoặc nhập giao dịch bằng tay.' : 'The image could not be read. Check it or enter the transaction manually.');
      }
    } finally {
      setReceiptBusy(false);
    }
  }

  async function requestCategorySuggestion() {
    if (categoryBusy || loading) return;
    setCategoryError('');
    setCategoryMessage('');
    if (!categoryConsent) {
      setCategoryError(isVi
        ? 'Hãy đồng ý gửi nội dung đã nhập và danh mục đang dùng tới OpenRouter.'
        : 'Consent to send the entered text and available categories to OpenRouter.');
      return;
    }
    const textForSuggestion = (currentType === 'payment' && itemName.trim()) || description.trim();
    if (!textForSuggestion) {
      setCategoryError(isVi ? 'Nhập tên sản phẩm hoặc mô tả trước.' : 'Enter a product name or description first.');
      return;
    }
    setCategoryBusy(true);
    try {
      const result = await apiPost<CategorySuggestion>('/ai/category-suggestion', {
        transactionType: currentType,
        description: textForSuggestion,
        providerConsent: true,
      }, { 'X-CSRF-Token': csrfToken });
      if (result.status === 'suggested' && result.categoryId) {
        setCategoryId(result.categoryId);
        setIsOtherSelected(false);
        setCustomCategoryName('');
        setCategoryMessage(isVi
          ? 'AI gợi ý danh mục này. Hãy kiểm tra hoặc đổi trước khi lưu.'
          : 'AI suggested this category. Review or change it before saving.');
      } else if (result.status === 'disabled') {
        setCategoryMessage(isVi ? 'Gợi ý AI chưa được bật trên máy chủ. Bạn có thể chọn danh mục thủ công.' : 'AI suggestions are disabled on the server. Choose a category manually.');
      } else {
        setCategoryMessage(isVi ? 'AI chưa đủ chắc để chọn. Hãy chọn danh mục thủ công.' : 'AI was not confident enough. Choose a category manually.');
      }
    } catch (caught) {
      setCategoryError(caught instanceof ApiRequestError && caught.isRateLimited
        ? (isVi ? 'Bạn đã dùng hết lượt gợi ý tạm thời.' : 'The suggestion limit was reached for now.')
        : (isVi ? 'Không tải được gợi ý. Hãy chọn danh mục thủ công.' : 'Suggestions are unavailable. Choose a category manually.'));
    } finally {
      setCategoryBusy(false);
    }
  }

  const modalTitle = currentType === 'income' ? t.addIncome : t.addPayment;

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel={isSuccess ? t.transactionSaved : modalTitle} closeDisabled={loading}>
      {isSuccess && savedTransaction ? (
        <div className="transaction-success-view" role="status" aria-live="polite">
          <div className="panel-heading">
            <h2>{t.transactionSaved}</h2>
          </div>
          <p>{savedTransaction.type === 'income' ? t.income : t.spending}</p>
          <strong>{formatVnd(savedTransaction.amountVnd, locale)}</strong>
          {savedTransaction.itemName && <p>{savedTransaction.itemName}</p>}
          {savedTransaction.description && <p>{savedTransaction.description}</p>}
          {budgetWarning && <BudgetWarningBanner warning={budgetWarning} locale={locale} />}
          <button autoFocus className="primary-button" onClick={handleCloseSuccess}>
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
              disabled={loading}
              aria-label={t.close}
            >
              <X size={18} />
            </button>
          </div>

          {/* Segmented Type Toggle */}
          <div
            className="type-toggle-switch"
            role="group"
            aria-label={isVi ? 'Loại giao dịch' : 'Transaction type'}
          >
            <button
              type="button"
              className={`toggle-option ${currentType === 'payment' ? 'active-payment' : ''}`}
              aria-pressed={currentType === 'payment'}
              onClick={() => {
                setCurrentType('payment');
                setCategoryId('');
                setIsOtherSelected(false);
                setCustomCategoryName('');
              }}
            >
              <ArrowUpRight size={16} />
              <span>{isVi ? 'Khoản chi' : 'Expense'}</span>
            </button>
            <button
              type="button"
              className={`toggle-option ${currentType === 'income' ? 'active-income' : ''}`}
              aria-pressed={currentType === 'income'}
              onClick={() => {
                setCurrentType('income');
                setItemName('');
                setCategoryId('');
                setIsOtherSelected(false);
                setCustomCategoryName('');
              }}
            >
              <ArrowDownLeft size={16} />
              <span>{isVi ? 'Khoản thu' : 'Income'}</span>
            </button>
          </div>

          <div className="form-field-wrapper">
            <label htmlFor="tx-occurred-on">{t.transactionDate}</label>
            <input
              id="tx-occurred-on"
              type="date"
              value={occurredOn}
              max={today}
              onChange={event => setOccurredOn(event.target.value)}
              disabled={loading}
              required
            />
          </div>

          {currentType === 'payment' && (
            <div
              className="form-field-wrapper item-name-field"
              onFocusCapture={() => setItemSuggestionsOpen(true)}
              onBlurCapture={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setItemSuggestionsOpen(false);
                }
              }}
            >
              <label htmlFor="tx-item-name">{t.itemName}</label>
              <input
                id="tx-item-name"
                type="text"
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                disabled={loading}
                maxLength={120}
                placeholder={t.itemNamePlaceholder}
                autoComplete="off"
              />
              {itemSuggestionsOpen && itemSuggestions.length > 0 && (
                <div className="item-suggestion-panel" role="group" aria-label={isVi ? 'Mặt hàng bạn mua thường xuyên' : 'Frequently bought items'}>
                  <span className="item-suggestion-heading">{isVi ? 'Chọn nhanh mặt hàng thường mua' : 'Pick a frequent item'}</span>
                  <div className="item-suggestion-list">
                    {itemSuggestions.slice(0, 10).map((item, index) => (
                      <button
                        key={item.itemName.toLocaleLowerCase()}
                        type="button"
                        className="item-suggestion-chip"
                        aria-label={`${item.itemName}, ${item.frequency} ${isVi ? 'lần' : 'times'}`}
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => setItemName(item.itemName)}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <span className="item-suggestion-name">{item.itemName}</span>
                        <span className="item-suggestion-frequency">{item.frequency}×</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {itemSuggestionsOpen && itemSuggestionsLoaded && !itemSuggestionsFailed && itemSuggestions.length === 0 && (
                <div className="item-suggestion-panel item-suggestion-empty" role="status">
                  <span className="item-suggestion-heading">{isVi ? 'Gợi ý cá nhân' : 'Personal suggestions'}</span>
                  <p className="item-suggestion-empty-note">{t.itemSuggestionsEmpty}</p>
                </div>
              )}
              {itemSuggestionsLoading && <small role="status">{t.loading}</small>}
              {itemSuggestionsFailed && <small role="status">{t.itemSuggestionsUnavailable}</small>}
              {matchedItem && currentPurchaseInterval !== null && (
                <div className="field-hint">
                  <p>
                    {t.itemHistoryLastPurchase
                      .replace('{amount}', formatVnd(matchedItem.lastAmountVnd, locale))
                      .replace('{date}', new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
                        dateStyle: 'medium',
                        timeZone: 'Asia/Ho_Chi_Minh',
                      }).format(new Date(matchedItem.lastOccurredAt)))}
                  </p>
                  {currentPurchaseInterval !== null && (
                    <p>{t.itemHistoryCurrentInterval.replace('{days}', String(currentPurchaseInterval))}</p>
                  )}
                  {previousPurchaseInterval !== null && (
                    <p>{t.itemHistoryPreviousInterval.replace('{days}', String(previousPurchaseInterval))}</p>
                  )}
                  {purchaseIntervalMessage && <p>{purchaseIntervalMessage}</p>}
                </div>
              )}
            </div>
          )}

          {currentType === 'payment' && (
            <section className="transaction-assist-panel" aria-labelledby="receipt-assist-title">
              <h4 id="receipt-assist-title"><Camera size={16} />{isVi ? 'Nhập từ hóa đơn' : 'Read a receipt'}</h4>
              <label className="file-select-label" htmlFor="receipt-image">{isVi ? 'Chụp hoặc chọn ảnh JPEG/PNG' : 'Take or choose a JPEG/PNG image'}</label>
              <input
                id="receipt-image"
                type="file"
                accept="image/jpeg,image/png"
                capture="environment"
                disabled={receiptBusy || loading}
                onChange={event => {
                  setReceiptFile(event.currentTarget.files?.[0] ?? null);
                  setReceiptMessage('');
                  setReceiptError('');
                  setReceiptConsent(false);
                }}
              />
              {receiptFile && <small>{receiptFile.name}</small>}
              <label className="provider-consent">
                <input type="checkbox" checked={receiptConsent} onChange={event => setReceiptConsent(event.target.checked)} disabled={receiptBusy || loading} />
                <span>{isVi
                  ? 'Tôi đồng ý gửi ảnh đã chọn tới Google Cloud Vision. Campus Coin chỉ nhận bản nháp số tiền/mô tả; ảnh không được lưu vào giao dịch.'
                  : 'I agree to send the selected image to Google Cloud Vision. Campus Coin receives only a draft amount/description; the image is not saved with the transaction.'}</span>
              </label>
              <button type="button" className="secondary-button assist-action" onClick={() => void readReceipt()} disabled={!receiptFile || receiptBusy || loading}>
                <Camera size={15} />{receiptBusy ? (isVi ? 'Đang đọc ảnh…' : 'Reading image…') : (isVi ? 'Đọc hóa đơn' : 'Read receipt')}
              </button>
              {receiptError && <p className="assist-error" role="alert">{receiptError}</p>}
              {receiptMessage && <p className="assist-status" role="status" aria-live="polite">{receiptMessage}</p>}
            </section>
          )}

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
                data-modal-autofocus
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
            {matchedItem && currentPurchaseInterval !== null && currentAmountVnd !== null && (
              <div className="field-hint">
                {currentAmountVnd > matchedItem.lastAmountVnd && (
                  <p>
                    {t.itemHistoryPriceHigher.replace(
                      '{amount}',
                      formatVnd(currentAmountVnd - matchedItem.lastAmountVnd, locale),
                    )}
                  </p>
                )}
                {currentAmountVnd < matchedItem.lastAmountVnd && (
                  <p>
                    {t.itemHistoryPriceLower.replace(
                      '{amount}',
                      formatVnd(matchedItem.lastAmountVnd - currentAmountVnd, locale),
                    )}
                  </p>
                )}
                {currentAmountVnd === matchedItem.lastAmountVnd && <p>{t.itemHistoryPriceSame}</p>}
              </div>
            )}
          </div>

          {/* Category Select */}
          <div className="form-field-wrapper">
            <CategorySelect
              appliesTo={currentType}
              value={categoryId}
              onChange={setCategoryId}
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
                  data-modal-autofocus
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
              onChange={e => setDescription(e.target.value)}
              disabled={loading}
              maxLength={255}
              placeholder={isVi ? 'Ví dụ: Cơm trưa căng tin, giáo trình...' : 'e.g. Lunch, books...'}
            />
          </div>

          <section className="transaction-assist-panel ai-category-panel" aria-labelledby="ai-category-title">
            <h4 id="ai-category-title"><Sparkles size={16} />{isVi ? 'Gợi ý danh mục bằng AI' : 'AI category suggestion'}</h4>
            <label className="provider-consent">
              <input type="checkbox" checked={categoryConsent} onChange={event => setCategoryConsent(event.target.checked)} disabled={categoryBusy || loading} />
              <span>{isVi
                ? 'Tôi đồng ý gửi tên sản phẩm hoặc mô tả đã nhập cùng các danh mục đang hoạt động tới OpenRouter để gợi ý. AI chỉ đề xuất; tôi sẽ kiểm tra trước khi lưu.'
                : 'I agree to send the product name or description and active categories to OpenRouter for a suggestion. AI only suggests; I will review it before saving.'}</span>
            </label>
            <button type="button" className="secondary-button assist-action" onClick={() => void requestCategorySuggestion()} disabled={categoryBusy || loading}>
              <Sparkles size={15} />{categoryBusy ? (isVi ? 'Đang hỏi AI…' : 'Asking AI…') : (isVi ? 'Gợi ý danh mục' : 'Suggest a category')}
            </button>
            {categoryError && <p className="assist-error" role="alert">{categoryError}</p>}
            {categoryMessage && <p className="assist-status" role="status" aria-live="polite">{categoryMessage}</p>}
          </section>

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
              disabled={loading || providerBusy || !amount || !categoryId || (isOtherSelected && !customCategoryName.trim())}
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
