import { useEffect, useState, useCallback } from 'react';
import { usePagination } from '../hooks/use-pagination.js';
import { apiGet } from '../api-client.js';
import type { Savings, SavingsTransfer, Locale } from '../types.js';
import type { Copy } from '../i18n.js';
import { formatVnd, formatDate } from '../format.js';
import {
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  Plus,
  Minus,
  Wallet,
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
}

export function SavingsScreen({ csrfToken, t, locale }: SavingsScreenProps) {
  const isVi = locale === 'vi';
  const [balance, setBalance] = useState<Savings | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState<Error | null>(null);
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
      setBalanceError(err instanceof Error ? err : new Error('Failed to load balance'));
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBalance();
    void reload();
  }, [loadBalance, reload]);

  const handleSuccess = () => {
    void loadBalance();
    void reload();
  };

  return (
    <div className="savings-page">
      {/* Top Banner: Savings Balance Card & Quick Actions */}
      <div className="savings-hero-grid">
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
            >
              <Plus size={16} />
              <span>{isVi ? 'Gửi tiết kiệm' : 'Deposit'}</span>
            </button>
            <button
              type="button"
              className="secondary-button withdraw-btn"
              onClick={() => setFormOpen('withdraw')}
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
            <strong>{isVi ? 'Mẹo tích lũy sinh viên' : 'Smart Student Saving Tip'}</strong>
          </div>
          <p>
            {isVi
              ? 'Tích lũy 10% đến 20% mỗi khi nhận thu nhập giúp bạn duy trì quỹ dự phòng an toàn cho các kỳ thi và học phí.'
              : 'Saving 10% to 20% whenever receiving allowance or income builds a resilient emergency fund for campus life.'}
          </p>
          <div className="savings-meta-badges">
            <span className="savings-pill">✓ {isVi ? 'Không phụ phí' : 'Zero fees'}</span>
            <span className="savings-pill">✓ {isVi ? 'Rút tức thì' : 'Instant withdraw'}</span>
          </div>
        </div>
      </div>

      <ErrorBanner error={transfersError?.message ?? null} locale={locale} />

      {/* Transfer History Table */}
      <div className="savings-history-card panel">
        <div className="panel-heading">
          <div>
            <h3>{isVi ? 'Lịch sử giao dịch quỹ tiết kiệm' : 'Savings Vault History'}</h3>
            <p className="muted">{isVi ? 'Nhật ký các lần gửi vào và rút ra từ quỹ' : 'Record of deposits and withdrawals'}</p>
          </div>
        </div>

        <div className="table-responsive">
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

              {!transfersLoading && transfers.length === 0 && (
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

        {hasMore && !transfersLoading && (
          <div className="table-footer-actions">
            <button
              type="button"
              className="secondary-button load-more-btn"
              onClick={() => void loadMore()}
            >
              <span>{isVi ? 'Xem thêm lịch sử' : 'Load more history'}</span>
              <ChevronRight size={16} />
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
          onClose={() => setFormOpen(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
