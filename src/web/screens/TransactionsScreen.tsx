import { useEffect, useState } from 'react';
import { usePagination } from '../hooks/use-pagination.js';
import type { Transaction, Locale } from '../types.js';
import type { Copy } from '../i18n.js';
import { formatVnd, formatDate } from '../format.js';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { ErrorBanner } from '../components/ErrorBanner.js';

interface TransactionsScreenProps {
  t: Copy;
  locale: Locale;
}

export function TransactionsScreen({ t, locale }: TransactionsScreenProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'payment'>('all');
  
  const basePath = `/ledger/transactions?limit=20${typeFilter !== 'all' ? `&type=${typeFilter}` : ''}`;
  const { data, loading, error, hasMore, loadMore, reload } = usePagination<Transaction>(basePath);

  // Reload when filter changes
  useEffect(() => {
    void reload();
  }, [typeFilter, reload]);

  return (
    <section className="feature-panel panel">
      <div className="panel-heading">
        <div>
          <h2>{t.transactions}</h2>
        </div>
        <div className="filters">
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value as any)}
            aria-label="Lọc theo loại giao dịch"
          >
            <option value="all">Tất cả</option>
            <option value="income">{t.income}</option>
            <option value="payment">{t.spending}</option>
          </select>
        </div>
      </div>

      <ErrorBanner error={error?.message ?? null} locale={locale} />

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Loại</th>
              <th scope="col">Ngày</th>
              <th scope="col">Danh mục</th>
              <th scope="col" className="text-right">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {data.map((tx) => {
              const isIncome = tx.type === 'income';
              return (
                <tr key={tx.id}>
                  <td>
                    <div className={`transaction-icon ${isIncome ? 'mint' : 'coral'}`} aria-label={isIncome ? t.income : t.spending}>
                      {isIncome ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                  </td>
                  <td>{formatDate(tx.occurredAt, locale)}</td>
                  <td>{tx.categoryId}</td>
                  <td className={`text-right ${isIncome ? 'amount-positive' : 'amount-negative'}`}>
                    {isIncome ? '+' : '-'}{formatVnd(tx.amountVnd, locale)}
                  </td>
                </tr>
              );
            })}
            
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  {t.noData}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="status-panel" role="status">{t.loading}</div>}

      {hasMore && !loading && (
        <div className="action-row">
          <button className="secondary-button" onClick={() => void loadMore()}>
            {t.more}
          </button>
        </div>
      )}
    </section>
  );
}
