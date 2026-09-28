import { useState, type FormEvent } from 'react';
import { apiPost, ApiRequestError } from '../api-client.js';
import { formatVnd, parseAmountVnd } from '../format.js';
import type { Locale } from '../types.js';
import { Modal } from './Modal.js';
import { Wallet, Sparkles, Check, X } from 'lucide-react';

interface InitWalletModalProps {
  csrfToken: string;
  locale: Locale;
  onClose: () => void;
  onSuccess: () => void;
}

const SUGGESTED_AMOUNTS = [0, 500000, 1000000, 2000000, 5000000];

export function InitWalletModal({
  csrfToken,
  locale,
  onClose,
  onSuccess,
}: InitWalletModalProps) {
  const isVi = locale === 'vi';
  const [amountStr, setAmountStr] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleQuickSelect(val: number) {
    setAmountStr(String(val));
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanNum = parseAmountVnd(amountStr);
    if (cleanNum === null || cleanNum < 0) {
      setError(isVi ? 'Số tiền không hợp lệ. Vui lòng nhập số không âm.' : 'Invalid amount. Please enter a non-negative number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiPost(
        '/wallet/baseline',
        { initialBalanceVnd: cleanNum },
        {
          'X-CSRF-Token': csrfToken,
          'Idempotency-Key': crypto.randomUUID(),
        }
      );
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.apiError?.code === 'WALLET_ALREADY_INITIALIZED') {
          setError(isVi ? 'Ví của bạn đã được khởi tạo trước đó.' : 'Wallet has already been initialized.');
        } else {
          setError(err.apiError?.message || (isVi ? 'Không thể khởi tạo ví. Vui lòng thử lại.' : 'Failed to initialize wallet.'));
        }
      } else {
        setError(isVi ? 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại.' : 'A server error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  const modalTitle = isVi ? 'Khởi tạo số dư ví' : 'Initialize Wallet';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      ariaLabel={modalTitle}
    >
      <div className="modal-header-row" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{modalTitle}</h3>
        <button
          type="button"
          className="icon-button modal-close-btn"
          onClick={onClose}
          aria-label={isVi ? 'Đóng' : 'Close'}
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #64748b)', lineHeight: 1.5 }}>
          {isVi
            ? 'Để bắt đầu ghi nhận các khoản thu chi, vui lòng thiết lập số tiền hiện có trong ví của bạn (có thể đặt là 0đ nếu bạn muốn bắt đầu từ đầu).'
            : 'To start recording transactions, please set your initial available wallet balance (you can set it to 0 VND to start fresh).'}
        </p>

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#ef4444',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        <div className="form-field-wrapper">
          <label style={{ fontSize: 12, fontWeight: 700, color: 'inherit' }}>
            {isVi ? 'Số dư hiện tại (VND)' : 'Current Balance (VND)'} <span style={{ color: '#f59e0b' }}>*</span>
          </label>
          <div className="amount-input-box">
            <span className="currency-prefix">₫</span>
            <input
              type="text"
              inputMode="numeric"
              className="amount-input"
              value={amountStr ? parseInt(amountStr.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : '0'}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setAmountStr(raw || '0');
                setError(null);
              }}
              placeholder="0"
              required
            />
          </div>

          <div className="quick-amount-chips" style={{ marginTop: 8 }}>
            {SUGGESTED_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                className="quick-chip"
                onClick={() => handleQuickSelect(val)}
                style={{
                  fontWeight: parseInt(amountStr, 10) === val ? 700 : 500,
                  borderColor: parseInt(amountStr, 10) === val ? '#f59e0b' : undefined,
                  background: parseInt(amountStr, 10) === val ? 'rgba(245, 158, 11, 0.15)' : undefined,
                  color: parseInt(amountStr, 10) === val ? '#b45309' : undefined,
                }}
              >
                {val === 0 ? (isVi ? '0 đ (Mới)' : '0 VND') : formatVnd(val, locale)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>
            {isVi ? 'Hủy' : 'Cancel'}
          </button>
          <button type="submit" className="primary-button" disabled={loading}>
            <Sparkles size={16} />
            {loading ? (isVi ? 'Đang tạo ví...' : 'Creating...') : (isVi ? 'Xác nhận tạo ví' : 'Confirm & Create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
