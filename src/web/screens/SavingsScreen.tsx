import { useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Calendar, ChevronRight, Minus, PiggyBank, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { apiRequest, errorMessage } from '../api.js';
import { formatDate, formatVnd } from '../format.js';
import type { Copy, Locale, Savings, SavingsTransfer, Session } from '../types.js';
import { usePagination } from '../hooks/use-pagination.js';
import { SavingsTransferForm } from '../components/SavingsTransferForm.js';

export function SavingsScreen({ session, t, locale }: { session: Session; t: Copy; locale: Locale }) {
  const isVi = locale === 'vi';
  const [balance, setBalance] = useState<Savings | null>(null);
  const [balanceState, setBalanceState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [balanceError, setBalanceError] = useState('');
  const [formOpen, setFormOpen] = useState<'deposit' | 'withdraw' | null>(null);
  const { data: transfers, loading, error, hasMore, loadMore, reload } = usePagination<SavingsTransfer>('/savings/transfers?limit=20');

  const loadBalance = useCallback(async () => {
    setBalanceState('loading');
    setBalanceError('');
    try {
      const nextBalance = await apiRequest<Savings | null>('/savings');
      setBalance(nextBalance);
      setBalanceState('ready');
    } catch (caught) {
      setBalanceError(errorMessage(caught, t));
      setBalanceState('error');
    }
  }, [t]);
  useEffect(() => { void loadBalance(); }, [loadBalance]);

  function handleSuccess() {
    void loadBalance();
    void reload();
  }

  return <div className="savings-page">
    <div className="savings-hero-grid">
      <section className="savings-balance-card panel">
        <div className="savings-balance-header"><span className="savings-icon-wrapper"><PiggyBank size={24} /></span><div><span className="savings-label">{isVi ? 'Quỹ tiết kiệm' : 'Savings balance'}</span><p className="savings-sublabel">{isVi ? 'Số dư được tải từ máy chủ' : 'Balance loaded from your account'}</p></div></div>
        <div className="savings-amount-display"><strong>{balanceState === 'loading' ? t.loading : balanceState === 'error' ? balanceError : formatVnd(balance?.balanceVnd, locale)}</strong></div>
        {balanceState === 'error' && <button type="button" className="secondary-button" onClick={() => void loadBalance()}><RefreshCw size={16} />{t.retry}</button>}
        {balanceState === 'ready' && balance === null && <p className="form-message">{t.noWalletForSavings}</p>}
        <div className="savings-actions-row">
          <button type="button" className="primary-button deposit-btn" disabled={!balance} onClick={() => setFormOpen('deposit')}><Plus size={16} />{t.deposit}</button>
          <button type="button" className="secondary-button withdraw-btn" disabled={!balance} onClick={() => setFormOpen('withdraw')}><Minus size={16} />{t.withdraw}</button>
        </div>
      </section>
      <section className="savings-tip-card panel"><div className="tip-header"><Sparkles size={18} /><strong>{isVi ? 'Tích lũy rõ ràng' : 'Savings made clear'}</strong></div><p>{isVi ? 'Theo dõi các khoản chuyển giữa ví và tiết kiệm dựa trên lịch sử do máy chủ lưu.' : 'Track transfers between your wallet and savings using server-backed history.'}</p><span className="savings-pill"><Calendar size={13} />{isVi ? 'Cập nhật trực tiếp' : 'Live account data'}</span></section>
    </div>
    <section className="savings-history-card panel">
      <div className="panel-heading"><div><h2>{t.savingsHistory}</h2><p className="muted">{isVi ? 'Các khoản nạp và rút đã ghi nhận' : 'Recorded deposits and withdrawals'}</p></div></div>
      {error && <p role="alert" className="form-message">{error.message}</p>}
      <div className="table-responsive"><table className="modern-data-table"><thead><tr><th scope="col">{isVi ? 'Loại' : 'Type'}</th><th scope="col">{t.transferNote}</th><th scope="col">{isVi ? 'Thời gian' : 'Date'}</th><th scope="col" className="text-right">{t.amount}</th></tr></thead><tbody>
        {transfers.map(transfer => { const deposit = transfer.direction === 'deposit'; return <tr key={transfer.id} className="transaction-table-row"><td><span className={`tx-type-badge ${deposit ? 'mint' : 'amber'}`}>{deposit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span></td><td>{transfer.note || (deposit ? t.deposit : t.withdraw)}</td><td>{formatDate(transfer.createdAt, locale)}</td><td className="text-right"><strong className={`tx-amount ${deposit ? 'positive' : 'negative'}`}>{deposit ? '+' : '-'}{formatVnd(transfer.amountVnd, locale)}</strong></td></tr>; })}
        {!loading && transfers.length === 0 && <tr><td colSpan={4} className="empty-state">{t.noData}</td></tr>}
      </tbody></table></div>
      {loading && <div className="table-loading-bar" role="status"><RefreshCw size={16} className="spin-icon" />{t.loading}</div>}
      {hasMore && !loading && <div className="table-footer-actions"><button type="button" className="secondary-button load-more-btn" onClick={() => void loadMore()}>{t.loadMore}<ChevronRight size={16} /></button></div>}
    </section>
    {formOpen && <SavingsTransferForm direction={formOpen} csrfToken={session.csrfToken} t={t} locale={locale} onClose={() => setFormOpen(null)} onSuccess={handleSuccess} />}
  </div>;
}
