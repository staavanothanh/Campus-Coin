import { useEffect, useState } from 'react';
import { usePagination } from '../hooks/use-pagination.js';
import { apiGet } from '../api-client.js';
import type { Savings, SavingsTransfer, Locale } from '../types.js';
import type { Copy } from '../i18n.js';
import { formatVnd, formatDate } from '../format.js';
import { ArrowDownLeft, ArrowUpRight, Leaf, Plus, Minus } from 'lucide-react';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { SavingsTransferForm } from '../components/SavingsTransferForm.js';

interface SavingsScreenProps {
  csrfToken: string;
  t: Copy;
  locale: Locale;
}

export function SavingsScreen({ csrfToken, t, locale }: SavingsScreenProps) {
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

  const loadBalance = async () => {
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
  };

  useEffect(() => {
    void loadBalance();
    void reload();
  }, [reload]);

  const handleSuccess = () => {
    void loadBalance();
    void reload();
  };

  return (
    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{t.savings}</h2>
            <p className="muted">{t.savingsTransfer}</p>
          </div>
          <div className="action-row">
            <button className="primary-button" onClick={() => setFormOpen('deposit')}>
              <Plus size={16} /> {locale === 'vi' ? 'Gửi' : 'Deposit'}
            </button>
            <button className="secondary-button" onClick={() => setFormOpen('withdraw')}>
              <Minus size={16} /> {locale === 'vi' ? 'Rút' : 'Withdraw'}
            </button>
          </div>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: '1fr', marginBottom: 'var(--space-6)' }}>
          <section className="balance-card stat-card" style={{ background: 'var(--amber-muted)' }}>
            <div className="stat-heading">
              <span>{t.balance}</span>
              <Leaf size={18} className="amber" />
            </div>
            <strong>
              {balanceLoading 
                ? '...' 
                : balanceError 
                  ? t.unavailable 
                  : formatVnd(balance?.balanceVnd, locale)}
            </strong>
          </section>
        </div>

        <ErrorBanner error={transfersError?.message ?? null} locale={locale} />

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Loại</th>
                <th scope="col">Ngày</th>
                <th scope="col">Ghi chú</th>
                <th scope="col" className="text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((tx) => {
                const isDeposit = tx.direction === 'deposit';
                return (
                  <tr key={tx.id}>
                    <td>
                      <div className={`transaction-icon ${isDeposit ? 'mint' : 'coral'}`} aria-label={isDeposit ? 'Gửi tiền' : 'Rút tiền'}>
                        {isDeposit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                    </td>
                    <td>{formatDate(tx.createdAt, locale)}</td>
                    <td>{tx.note ?? ''}</td>
                    <td className={`text-right ${isDeposit ? 'amount-positive' : 'amount-negative'}`}>
                      {isDeposit ? '+' : '-'}{formatVnd(tx.amountVnd, locale)}
                    </td>
                  </tr>
                );
              })}
              
              {!transfersLoading && transfers.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-state">
                    {t.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {transfersLoading && <div className="status-panel" role="status">{t.loading}</div>}

        {hasMore && !transfersLoading && (
          <div className="action-row">
            <button className="secondary-button" onClick={() => void loadMore()}>
              {t.more}
            </button>
          </div>
        )}
      </section>

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
