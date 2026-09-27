import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Calendar, ChevronRight, CreditCard, RefreshCw, Search } from 'lucide-react';
import { formatDate, formatVnd } from '../format.js';
import type { Copy, Locale, Transaction } from '../types.js';
import { usePagination } from '../hooks/use-pagination.js';

export function TransactionsScreen({ t, locale }: { t: Copy; locale: Locale }) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'payment'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const basePath = `/ledger/transactions?limit=20${typeFilter === 'all' ? '' : `&type=${typeFilter}`}`;
  const { data, loading, error, hasMore, loadMore, reload } = usePagination<Transaction>(basePath);
  useEffect(() => { void reload(); }, [typeFilter, reload]);

  const search = searchTerm.trim().toLocaleLowerCase(locale === 'vi' ? 'vi-VN' : 'en-US');
  const filtered = data.filter(transaction => !search || transaction.categoryId.toLocaleLowerCase(locale).includes(search) || (transaction.description ?? '').toLocaleLowerCase(locale).includes(search));
  const net = filtered.reduce((sum, transaction) => sum + (transaction.type === 'income' ? 1 : -1) * Number(transaction.amountVnd), 0);

  return <div className="transactions-page">
    <section className="transactions-header-panel panel">
      <div className="transactions-header-top"><div><h2>{t.transactions}</h2><p className="muted">{locale === 'vi' ? 'Lịch sử giao dịch tải từ máy chủ' : 'Transaction history loaded from the server'}</p></div>
        <div className="type-filter-group" role="group" aria-label={t.transactions}>
          {(['all', 'income', 'payment'] as const).map(filter => <button key={filter} type="button" className={`filter-chip ${typeFilter === filter ? 'active' : ''}`} aria-pressed={typeFilter === filter} onClick={() => setTypeFilter(filter)}>{filter === 'all' ? t.all : filter === 'income' ? t.income : t.spending}</button>)}
        </div>
      </div>
      <div className="transactions-subbar"><label className="search-box"><Search size={15} className="search-icon" /><span className="visually-hidden">{t.searchTransactions}</span><input type="search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder={t.searchTransactions} /></label><div className="transactions-summary-chip"><span className="summary-label">{t.filteredNet}:</span><strong className={net >= 0 ? 'positive' : 'negative'}>{net >= 0 ? '+' : ''}{formatVnd(net, locale)}</strong></div></div>
    </section>
    {error && <p role="alert" className="form-message">{error.message}</p>}
    <section className="transactions-table-card panel"><div className="table-responsive"><table className="modern-data-table"><thead><tr><th scope="col">{locale === 'vi' ? 'Loại' : 'Type'}</th><th scope="col">{locale === 'vi' ? 'Mô tả / Danh mục' : 'Description / Category'}</th><th scope="col">{locale === 'vi' ? 'Ngày giao dịch' : 'Date'}</th><th scope="col" className="text-right">{t.amount}</th></tr></thead><tbody>
      {filtered.map(transaction => { const income = transaction.type === 'income'; return <tr key={transaction.id} className="transaction-table-row"><td><span className={`tx-type-badge ${income ? 'mint' : 'coral'}`} aria-label={income ? t.income : t.spending}>{income ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span></td><td><div className="tx-details"><strong className="tx-category-tag">{transaction.categoryId}</strong>{transaction.description && <span className="tx-note">{transaction.description}</span>}</div></td><td><span className="tx-date-cell"><Calendar size={13} />{formatDate(transaction.occurredAt, locale)}</span></td><td className="text-right"><strong className={`tx-amount ${income ? 'positive' : 'negative'}`}>{income ? '+' : '-'}{formatVnd(transaction.amountVnd, locale)}</strong></td></tr>; })}
      {!loading && filtered.length === 0 && <tr><td colSpan={4} className="empty-state"><CreditCard size={28} /><p>{searchTerm ? (locale === 'vi' ? 'Không tìm thấy giao dịch phù hợp' : 'No matching transactions') : t.noData}</p></td></tr>}
    </tbody></table></div>
      {loading && <div className="table-loading-bar" role="status"><RefreshCw size={16} className="spin-icon" />{t.loading}</div>}
      {hasMore && !loading && <div className="table-footer-actions"><button type="button" className="secondary-button load-more-btn" onClick={() => void loadMore()}>{t.loadMoreTransactions}<ChevronRight size={16} /></button></div>}
    </section>
  </div>;
}
