import { useEffect, useState } from 'react';
import { usePagination } from '../hooks/use-pagination.js';
import { useCategories } from '../hooks/use-categories.js';
import type { Transaction, Locale } from '../types.js';
import type { Copy } from '../i18n.js';
import { formatVnd, formatDate } from '../format.js';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  CreditCard,
  Calendar,
  Tag,
  Search,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { ErrorBanner } from '../components/ErrorBanner.js';

interface TransactionsScreenProps {
  t: Copy;
  locale: Locale;
}

export function TransactionsScreen({ t, locale }: TransactionsScreenProps) {
  const isVi = locale === 'vi';
  const { getCategoryName } = useCategories();
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'payment'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const basePath = `/ledger/transactions?limit=20${typeFilter !== 'all' ? `&type=${typeFilter}` : ''}`;
  const { data, loading, error, hasMore, loadMore, reload } = usePagination<Transaction>(basePath);

  // Reload only when filter changes
  useEffect(() => {
    void reload();
  }, [typeFilter, reload]);

  const filteredData = data.filter(tx => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const catName = getCategoryName(tx.categoryId, locale).toLowerCase();
    const matchesCategory = catName.includes(term) || tx.categoryId?.toLowerCase().includes(term);
    const matchesDesc = `${tx.itemName ?? ''} ${tx.description ?? ''}`.toLowerCase().includes(term);
    return matchesCategory || matchesDesc;
  });

  const totalFilteredAmount = filteredData.reduce((sum, tx) => {
    return tx.type === 'income' ? sum + tx.amountVnd : sum - tx.amountVnd;
  }, 0);

  return (
    <div className="transactions-page">
      {/* Header & Filter Bar */}
      <div className="transactions-header-panel panel">
        <div className="transactions-header-top">
          <div>
            <h2>{t.transactions}</h2>
            <p className="muted">
              {isVi
                ? 'Lịch sử dòng tiền, thu chi và các khoản thanh toán'
                : 'History of cash flows, income and expenses'}
            </p>
          </div>

          {/* Quick Filter Tabs */}
          <div className="type-filter-group">
            <button
              type="button"
              className={`filter-chip ${typeFilter === 'all' ? 'active' : ''}`}
              aria-pressed={typeFilter === 'all'}
              onClick={() => setTypeFilter('all')}
            >
              {isVi ? 'Tất cả' : 'All'}
            </button>
            <button
              type="button"
              className={`filter-chip mint ${typeFilter === 'income' ? 'active' : ''}`}
              aria-pressed={typeFilter === 'income'}
              onClick={() => setTypeFilter('income')}
            >
              <ArrowDownLeft size={14} />
              {t.income}
            </button>
            <button
              type="button"
              className={`filter-chip coral ${typeFilter === 'payment' ? 'active' : ''}`}
              aria-pressed={typeFilter === 'payment'}
              onClick={() => setTypeFilter('payment')}
            >
              <ArrowUpRight size={14} />
              {t.spending}
            </button>
          </div>
        </div>

        {/* Search & Stats Bar */}
        <div className="transactions-subbar">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label={isVi ? 'Tìm giao dịch' : 'Search transactions'}
              placeholder={isVi ? 'Tìm theo danh mục hoặc ghi chú...' : 'Search category or note...'}
            />
          </div>

          <div className="transactions-summary-chip">
            <span className="summary-label">
              {isVi ? 'Tổng hiển thị:' : 'Filtered Net:'}
            </span>
            <strong
              className={!loading && !error ? (totalFilteredAmount >= 0 ? 'positive' : 'negative') : undefined}
              aria-live="polite"
            >
              {error
                ? (isVi ? 'Không khả dụng' : 'Unavailable')
                : loading
                  ? t.loading
                  : `${totalFilteredAmount >= 0 ? '+' : ''}${formatVnd(totalFilteredAmount, locale)}`}
            </strong>
          </div>
        </div>
      </div>

      <ErrorBanner error={error?.message ?? null} locale={locale} />
      {error && (
        <div className="table-footer-actions">
          <button
            type="button"
            className="secondary-button load-more-btn"
            onClick={() => void (data.length > 0 ? loadMore() : reload())}
          >
            {data.length > 0
              ? (isVi ? 'Thử tải giao dịch tiếp theo' : 'Retry loading more')
              : (isVi ? 'Thử tải lại' : 'Retry loading')}
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="transactions-table-card panel">
        <div
          className="table-responsive"
          role="region"
          aria-label={isVi ? 'Bảng giao dịch' : 'Transactions table'}
          tabIndex={0}
          aria-busy={loading}
        >
          <table className="modern-data-table">
            <thead>
              <tr>
                <th scope="col" style={{ width: '56px' }}>{isVi ? 'Loại' : 'Type'}</th>
                <th scope="col">{isVi ? 'Sản phẩm / Mô tả / Danh mục' : 'Product / Description / Category'}</th>
                <th scope="col">{isVi ? 'Ngày giao dịch' : 'Date'}</th>
                <th scope="col" className="text-right">{isVi ? 'Số tiền' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(tx => {
                const isIncome = tx.type === 'income';
                return (
                  <tr key={tx.id} className="transaction-table-row">
                    <td>
                      <div
                        className={`tx-type-badge ${isIncome ? 'mint' : 'coral'}`}
                        title={isIncome ? t.income : t.spending}
                      >
                        {isIncome ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                    </td>
                    <td>
                      <div className="tx-details">
                        <strong className="tx-category-tag">{getCategoryName(tx.categoryId, locale)}</strong>
                        {tx.itemName && <span className="tx-note">{tx.itemName}</span>}
                        {tx.description && (
                          <span className="tx-note">{tx.description}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="tx-date-cell">
                        <Calendar size={13} className="cell-icon" />
                        <span>{formatDate(tx.occurredAt, locale)}</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <strong className={`tx-amount ${isIncome ? 'positive' : 'negative'}`}>
                        {isIncome ? '+' : '-'}{formatVnd(tx.amountVnd, locale)}
                      </strong>
                    </td>
                  </tr>
                );
              })}

              {!loading && !error && filteredData.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-state">
                    <CreditCard size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p>{searchTerm ? (isVi ? 'Không tìm thấy giao dịch phù hợp' : 'No matching transactions') : t.noData}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Loading and Load More Footer */}
        {loading && (
          <div className="table-loading-bar" role="status">
            <RefreshCw size={16} className="spin-icon" />
            <span>{t.loading}</span>
          </div>
        )}

        {hasMore && data.length > 0 && (
          <div className="table-footer-actions">
            <button
              type="button"
              className="secondary-button load-more-btn"
              disabled={loading}
              onClick={() => void loadMore()}
            >
              <span aria-live="polite">{loading
                ? t.loading
                : (isVi ? 'Xem thêm giao dịch cũ hơn' : 'Load more transactions')}</span>
              {!loading && <ChevronRight size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
