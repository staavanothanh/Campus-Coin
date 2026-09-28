import { useEffect, useState, useCallback } from 'react';
import { usePagination } from '../hooks/use-pagination.js';
import { apiGet, ApiRequestError } from '../api-client.js';
import type { Savings, SavingsTransfer, Wallet, Locale } from '../types.js';
import type { Copy } from '../i18n.js';
import { formatVnd, formatDate } from '../format.js';
import {
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  Plus,
  Minus,
  Wallet as WalletIcon,
  Sparkles,
  Calendar,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { SavingsTransferForm } from '../components/SavingsTransferForm.js';

interface SavingsScreenProps {
  csrfToken: string;
  t: Copy;
  locale: Locale;
  onTransferSuccess?: () => void;
}

export function SavingsScreen({ csrfToken, t, locale, onTransferSuccess }: SavingsScreenProps) {
  const isVi = locale === 'vi';
  const [balance, setBalance] = useState<Savings | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState<Error | null>(null);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<Error | null>(null);

  const [formOpen, setFormOpen] = useState<'deposit' | 'withdraw' | null>(null);

  const {
    data: transfers,
    loading: transfersLoading,
    error: transfersError,
    hasMore,
    loadMore,
    reload
  } = usePagination<SavingsTransfer>('/savings/transfers?limit=20');

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const data = await apiGet<Savings>('/savings');
      setBalance(data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.isNotFound) {
        setBalance(null);
        return;
      }
      setBalanceError(err instanceof Error ? err : new Error('Failed to load balance'));
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const loadWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const data = await apiGet<Wallet>('/wallet');
      setWallet(data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.isNotFound) {
        setWallet(null);
        return;
      }
      setWalletError(err instanceof Error ? err : new Error('Failed to load wallet'));
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBalance();
    void loadWallet();
    void reload();
  }, [loadBalance, loadWallet, reload]);

  const handleSuccess = () => {
    void loadBalance();
    void loadWallet();
    void reload();
    onTransferSuccess?.();
  };

  return (
    <div className="savings-page">
      {/* Top Banner: Wallet Balance, Savings Balance & Quick Actions */}
      <div className="savings-hero-grid">
        {/* Main Wallet Balance Card */}
        <div className="savings-wallet-card panel">
          <div className="savings-balance-header">
            <div className="savings-wallet-icon-wrapper">
              <WalletIcon size={24} />
            </div>
            <div>
              <span className="savings-wallet-label">{isVi ? 'Tiền trong ví tổng' : 'Total Wallet Balance'}</span>
              <p className="savings-sublabel">
                {isVi ? 'Số dư khả dụng sẵn sàng chi tiêu' : 'Available for spending & transfers'}
              </p>
            </div>
          </div>

          <div className="savings-amount-display">
            <strong>
              {walletLoading
                ? '...'
                : walletError
                ? t.unavailable
                : formatVnd(wallet?.availableBalanceVnd, locale)}
            </strong>
          </div>

          <div className="savings-wallet-meta">
            <span className="savings-pill amber">✓ {isVi ? 'Ví chính (Khả dụng)' : 'Main Wallet (Available)'}</span>
          </div>
        </div>

        {/* Savings Balance Card & Quick Actions */}
        <div className="savings-balance-card panel">
          <div className="savings-balance-header">
            <div className="savings-icon-wrapper">
              <PiggyBank size={24} />
            </div>
            <div>
              <span className="savings-label">{isVi ? 'Tổng quỹ tiết kiệm' : 'Total Savings Vault'}</span>
              <p className="savings-sublabel">
                {isVi ? 'Dành riêng cho mục tiêu học tập & dự phòng' : 'Reserved for study goals & emergency'}
              </p>
            </div>
          </div>

          <div className="savings-amount-display">
            <strong>
              {balanceLoading
                ? '...'
                : balanceError
                ? t.unavailable
                : formatVnd(balance?.balanceVnd, locale)}
            </strong>
          </div>

          <div className="savings-actions-row">
            <button
              type="button"
              className="primary-button deposit-btn"
              onClick={() => setFormOpen('deposit')}
              disabled={balanceLoading || walletLoading || !wallet || !balance}
            >
              <Plus size={16} />
              <span>{isVi ? 'Gửi tiết kiệm' : 'Deposit'}</span>
            </button>
            <button
              type="button"
              className="secondary-button withdraw-btn"
              onClick={() => setFormOpen('withdraw')}
              disabled={balanceLoading || walletLoading || !wallet || !balance}
            >
              <Minus size={16} />
              <span>{isVi ? 'Rút về ví' : 'Withdraw'}</span>
            </button>
          </div>
        </div>

        {/* Tip / Feature Card */}
        <div className="savings-tip-card panel">
          <div className="tip-header">
            <Sparkles size={18} className="tip-icon" />
            <strong>{isVi ? 'Tích lũy theo kế hoạch của bạn' : 'Save at your own pace'}</strong>
          </div>
          <p>
            {isVi
              ? 'Bạn tự chọn số tiền chuyển từ ví vào quỹ tiết kiệm. Khi cần, bạn có thể chuyển khoản đó trở lại ví.'
              : 'Choose how much to move from your wallet into savings. Move that amount back to your wallet when needed.'}
          </p>
          <div className="savings-meta-badges">
            <span className="savings-pill">✓ {isVi ? 'Bạn chủ động chọn số tiền' : 'You choose the amount'}</span>
          </div>
        </div>
      </div>

      <ErrorBanner error={transfersError?.message ?? null} locale={locale} />
      {transfersError && (
        <div className="table-footer-actions">
          <button
            type="button"
            className="secondary-button load-more-btn"
            onClick={() => void (transfers.length > 0 ? loadMore() : reload())}
          >
            {transfers.length > 0
              ? (isVi ? 'Thử tải lịch sử tiếp theo' : 'Retry loading more')
              : (isVi ? 'Thử tải lại' : 'Retry loading')}
          </button>
        </div>
      )}

      {/* Transfer History Table */}
      <div className="savings-history-card panel">
        <div className="panel-heading">
          <div>
            <h3>{isVi ? 'Lịch sử giao dịch quỹ tiết kiệm' : 'Savings Vault History'}</h3>
            <p className="muted">{isVi ? 'Nhật ký các lần gửi vào và rút ra từ quỹ' : 'Record of deposits and withdrawals'}</p>
          </div>
        </div>

        <div
          className="table-responsive"
          role="region"
          aria-label={isVi ? 'Bảng lịch sử tiết kiệm' : 'Savings history table'}
          tabIndex={0}
          aria-busy={transfersLoading}
        >
          <table className="modern-data-table">
            <thead>
              <tr>
                <th scope="col" style={{ width: '56px' }}>{isVi ? 'Loại' : 'Type'}</th>
                <th scope="col">{isVi ? 'Ghi chú giao dịch' : 'Note'}</th>
                <th scope="col">{isVi ? 'Thời gian' : 'Date & Time'}</th>
                <th scope="col" className="text-right">{isVi ? 'Số tiền' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(tx => {
                const isDeposit = tx.direction === 'deposit';
                return (
                  <tr key={tx.id} className="transaction-table-row">
                    <td>
                      <div
                        className={`tx-type-badge ${isDeposit ? 'mint' : 'amber'}`}
                        title={isDeposit ? (isVi ? 'Gửi vào quỹ' : 'Deposit') : (isVi ? 'Rút ra' : 'Withdraw')}
                      >
                        {isDeposit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                    </td>
                    <td>
                      <div className="tx-details">
                        <strong className="tx-category-tag">
                          {isDeposit ? (isVi ? 'Nạp tiết kiệm' : 'Deposit') : (isVi ? 'Rút tiết kiệm' : 'Withdrawal')}
                        </strong>
                        {tx.note && <span className="tx-note">{tx.note}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="tx-date-cell">
                        <Calendar size={13} className="cell-icon" />
                        <span>{formatDate(tx.createdAt, locale)}</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <strong className={`tx-amount ${isDeposit ? 'positive' : 'negative'}`}>
                        {isDeposit ? '+' : '-'}{formatVnd(tx.amountVnd, locale)}
                      </strong>
                    </td>
                  </tr>
                );
              })}

              {!transfersLoading && !transfersError && transfers.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-state">
                    <PiggyBank size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p>{t.noData}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {transfersLoading && (
          <div className="table-loading-bar" role="status">
            <RefreshCw size={16} className="spin-icon" />
            <span>{t.loading}</span>
          </div>
        )}

        {hasMore && transfers.length > 0 && (
          <div className="table-footer-actions">
            <button
              type="button"
              className="secondary-button load-more-btn"
              disabled={transfersLoading}
              onClick={() => void loadMore()}
            >
              <span aria-live="polite">{transfersLoading
                ? t.loading
                : (isVi ? 'Xem thêm lịch sử' : 'Load more history')}</span>
              {!transfersLoading && <ChevronRight size={16} />}
            </button>
          </div>
        )}
      </div>

      {formOpen && (
        <SavingsTransferForm
          direction={formOpen}
          csrfToken={csrfToken}
          t={t}
          locale={locale}
          currentWalletVnd={wallet?.availableBalanceVnd}
          currentSavingsVnd={balance?.balanceVnd}
          onClose={() => setFormOpen(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
