import { useRef, useState, type FormEvent } from 'react';
import { apiPost, ApiRequestError } from '../api-client.js';
import { Modal } from './Modal.js';
import type { Category, CorrectionRole, Locale, Transaction } from '../types.js';
import type { Copy } from '../i18n.js';

interface CorrectionModalProps {
  transaction: Transaction;
  categories: Category[];
  csrfToken: string;
  locale: Locale;
  t: Copy;
  onClose: () => void;
  onCreated: () => void;
}

interface CorrectionRequest {
  signature: string;
  key: string;
}

export function CorrectionModal({
  transaction,
  categories,
  csrfToken,
  locale,
  t,
  onClose,
  onCreated,
}: CorrectionModalProps) {
  const isVi = locale === 'vi';
  const copy = isVi
    ? {
        title: 'Đính chính giao dịch',
        close: 'Đóng cửa sổ',
        role: 'Cách đính chính',
        chooseRole: 'Chọn cách xử lý',
        reversal: 'Đảo giao dịch',
        adjustment: 'Điều chỉnh số tiền',
        replacement: 'Thay thế giao dịch',
        reversalHelp: 'Ghi một dòng đối ứng mới. Giao dịch gốc vẫn được giữ trong lịch sử.',
        adjustmentHelp: 'Ghi lại số tiền đúng và phần chênh lệch; danh mục được giữ nguyên.',
        replacementHelp: 'Ghi số tiền đúng; bạn có thể chọn danh mục khác. Dòng gốc vẫn được giữ.',
        reason: 'Lý do',
        amount: 'Số tiền đúng (VND)',
        category: 'Danh mục mới (tùy chọn)',
        keepCategory: 'Giữ danh mục hiện tại',
        cancel: 'Hủy',
        submit: 'Lưu đính chính',
        reasonRequired: 'Hãy nhập lý do đính chính.',
        amountInvalid: 'Số tiền phải là số nguyên VND dương hợp lệ.',
        insufficientBalance: 'Số dư ví không đủ để ghi nhận thay đổi này.',
        alreadyCorrected: 'Giao dịch này đã được đính chính hoặc không thể đính chính.',
        notFound: 'Không tìm thấy giao dịch cần đính chính.',
        failed: 'Không thể lưu đính chính. Giao dịch gốc vẫn được giữ nguyên.',
        success: 'Đã ghi đính chính; lịch sử gốc vẫn được giữ.',
        correct: 'Đính chính',
        corrected: 'Đã đính chính',
        linkedTo: 'Liên quan giao dịch',
      }
    : {
        title: 'Correct transaction',
        close: 'Close dialog',
        role: 'Correction type',
        chooseRole: 'Choose an action',
        reversal: 'Reverse transaction',
        adjustment: 'Adjust amount',
        replacement: 'Replace transaction',
        reversalHelp: 'Adds an offsetting entry. The original transaction stays in the history.',
        adjustmentHelp: 'Records the corrected amount and difference; the category stays the same.',
        replacementHelp: 'Records the corrected amount; you may choose another category. The original stays.',
        reason: 'Reason',
        amount: 'Correct amount (VND)',
        category: 'New category (optional)',
        keepCategory: 'Keep current category',
        cancel: 'Cancel',
        submit: 'Save correction',
        reasonRequired: 'Enter a reason for this correction.',
        amountInvalid: 'Enter a valid positive whole number of VND.',
        insufficientBalance: 'The wallet balance is too low for this correction.',
        alreadyCorrected: 'This transaction was already corrected or cannot be corrected.',
        notFound: 'The transaction to correct could not be found.',
        failed: 'Could not save the correction. The original transaction remains unchanged.',
        success: 'Correction recorded; the original history remains available.',
        correct: 'Correct',
        corrected: 'Corrected',
        linkedTo: 'Related transaction',
      };

  const [role, setRole] = useState<CorrectionRole | ''>('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(String(transaction.amountVnd));
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestRef = useRef<CorrectionRequest | null>(null);

  const matchingCategories = categories.filter(category =>
    category.appliesTo === transaction.type && category.status === 'active',
  );

  function getErrorMessage(caught: unknown): string {
    if (!(caught instanceof ApiRequestError)) return t.unavailableDetail;
    if (caught.apiError?.code === 'INSUFFICIENT_WALLET_BALANCE') return copy.insufficientBalance;
    if (caught.apiError?.code === 'CORRECTION_NOT_ALLOWED' || caught.status === 409) return copy.alreadyCorrected;
    if (caught.apiError?.code === 'NOT_FOUND' || caught.status === 404) return copy.notFound;
    if (caught.status >= 500) return t.unavailableDetail;
    return copy.failed;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setError(copy.reasonRequired);
      return;
    }
    if (!role) {
      setError(isVi ? 'Hãy chọn cách đính chính.' : 'Choose a correction type.');
      return;
    }

    const body: {
      correctionRole: CorrectionRole;
      reason: string;
      newAmountVnd?: number;
      newCategoryId?: string;
    } = { correctionRole: role, reason: normalizedReason };

    if (role !== 'reversal') {
      const amountVnd = Number(amount);
      if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) {
        setError(copy.amountInvalid);
        return;
      }
      body.newAmountVnd = amountVnd;
    }
    if (role === 'replacement' && categoryId && categoryId !== transaction.categoryId) {
      body.newCategoryId = categoryId;
    }

    const signature = `${transaction.id}:${JSON.stringify(body)}`;
    if (!requestRef.current || requestRef.current.signature !== signature) {
      requestRef.current = { signature, key: crypto.randomUUID() };
    }

    setSubmitting(true);
    try {
      await apiPost(
        `/ledger/transactions/${transaction.id}/corrections`,
        body,
        {
          'X-CSRF-Token': csrfToken,
          'Idempotency-Key': requestRef.current.key,
        },
      );
      onCreated();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedHelp = role === 'reversal'
    ? copy.reversalHelp
    : role === 'adjustment'
      ? copy.adjustmentHelp
      : role === 'replacement'
        ? copy.replacementHelp
        : '';

  return (
    <Modal isOpen onClose={onClose} ariaLabel={copy.title} closeDisabled={submitting}>
      <form className="transaction-modal-form" onSubmit={submit}>
        <div className="modal-header-row">
          <h3>{copy.title}</h3>
          <button type="button" className="icon-button modal-close-btn" onClick={onClose} disabled={submitting} aria-label={copy.close}>×</button>
        </div>

        <p className="muted">
          {transaction.type === 'income' ? t.income : t.spending}: {transaction.amountVnd.toLocaleString(locale)} VND
        </p>

        <div>
          <label htmlFor="correction-role">{copy.role}</label>
          <select
            id="correction-role"
            value={role}
            onChange={event => setRole(event.target.value as CorrectionRole | '')}
            required
            data-modal-autofocus
          >
            <option value="">{copy.chooseRole}</option>
            <option value="reversal">{copy.reversal}</option>
            <option value="adjustment">{copy.adjustment}</option>
            <option value="replacement">{copy.replacement}</option>
          </select>
        </div>

        {selectedHelp && <p className="muted" role="status">{selectedHelp}</p>}

        {role !== '' && role !== 'reversal' && (
          <div>
            <label htmlFor="correction-amount">{copy.amount}</label>
            <input
              id="correction-amount"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              required
            />
          </div>
        )}

        {role === 'replacement' && (
          <div>
            <label htmlFor="correction-category">{copy.category}</label>
            <select id="correction-category" value={categoryId} onChange={event => setCategoryId(event.target.value)}>
              <option value="">{copy.keepCategory}</option>
              {matchingCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {locale === 'vi' ? category.name.vi : category.name.en}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="correction-reason">{copy.reason}</label>
          <input
            id="correction-reason"
            type="text"
            value={reason}
            onChange={event => setReason(event.target.value)}
            maxLength={1000}
            required
          />
        </div>

        {error && <p className="error-message" role="alert">{error}</p>}

        <div className="modal-actions-row">
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>{copy.cancel}</button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? t.loading : copy.submit}
          </button>
        </div>
      </form>
    </Modal>
  );
}
