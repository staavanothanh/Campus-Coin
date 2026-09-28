import { Fragment, useEffect, useState } from 'react';
import { usePagination } from '../hooks/use-pagination.js';
import { useCategories } from '../hooks/use-categories.js';
import type { Transaction, Locale } from '../types.js';
import type { Copy } from '../i18n.js';
import { formatVnd, formatDate } from '../format.js';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Calendar,
  Search,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { formatTransactionGroupLabel, groupTransactions, isValidDateRange, transactionListPath, type TransactionGrouping } from '../transaction-filters.js';

interface TransactionsScreenProps {
  t: Copy;
  locale: Locale;
}

export function TransactionsScreen({ t, locale }: TransactionsScreenProps) {
  const isVi = locale === 'vi';
  const { getCategoryName } = useCategories();
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'payment'>('all');
  const [grouping, setGrouping] = useState<TransactionGrouping>('day');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const validDateRange = isValidDateRange(dateFrom, dateTo);
  const basePath = transactionListPath(typeFilter, dateFrom, dateTo);
  const { data, loading, error, hasMore, loadMore, reload } = usePagination<Transaction>(basePath);

  // Reset cursor and ignore any older request when a server-side filter changes.
  useEffect(() => {
    if (validDateRange) void reload();
  }, [typeFilter, dateFrom, dateTo, validDateRange, reload]);

  const filteredData = (validDateRange ? data : []).filter(tx => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const catName = getCategoryName(tx.categoryId, locale).toLowerCase();
    const matchesCategory = catName.includes(term) || tx.categoryId?.toLowerCase().includes(term);
    const matchesDesc = tx.description?.toLowerCase().includes(term);
    return matchesCategory || matchesDesc;
  });

  const totalFilteredAmount = filteredData.reduce((sum, tx) => {
    return tx.type === 'income' ? sum + tx.amountVnd : sum - tx.amountVnd;
  }, 0);
  const groupedTransactions = groupTransactions(filteredData, grouping);

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
          <div className="type-filter-group" role="group" aria-label={isVi ? 'Lọc theo loại giao dịch' : 'Filter by transaction type'}>
            <button
              type="button"
              className={`filter-chip ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTypeFilter('all')}
              aria-pressed={typeFilter === 'all'}
            >
              {isVi ? 'Tất cả' : 'All'}
            </button>
            <button
              type="button"
              className={`filter-chip mint ${typeFilter === 'income' ? 'active' : ''}`}
              onClick={() => setTypeFilter('income')}
              aria-pressed={typeFilter === 'income'}
            >
              <ArrowDownLeft size={14} />
              {t.income}
            </button>
            <button
              type="button"
              className={`filter-chip coral ${typeFilter === 'payment' ? 'active' : ''}`}
              onClick={() => setTypeFilter('payment')}
              aria-pressed={typeFilter === 'payment'}
            >
              <ArrowUpRight size={14} />
              {t.spending}
            </button>
          </div>
        </div>

        {/* Search, grouping, date range and summary */}
        <div className="transactions-subbar">
          <div className="transaction-controls">
            <div className="transaction-filter-row">
              <div className="search-box">
                <Search size={15} className="search-icon" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={isVi ? 'Tìm theo danh mục hoặc ghi chú...' : 'Search category or note...'}
                  aria-label={isVi ? 'Tìm giao dịch' : 'Search transactions'}
                />
              </div>
              <div className="transaction-grouping" role="group" aria-label={isVi ? 'Nhóm giao dịch' : 'Group transactions'}>
                <button
                  type="button"
                  className={`filter-chip ${grouping === 'day' ? 'active' : ''}`}
                  aria-pressed={grouping === 'day'}
                  onClick={() => setGrouping('day')}
                >{t.groupByDay}</button>
                <button
                  type="button"
                  className={`filter-chip ${grouping === 'month' ? 'active' : ''}`}
                  aria-pressed={grouping === 'month'}
                  onClick={() => setGrouping('month')}
                >{t.groupByMonth}</button>
              </div>
            </div>
            <div className="transaction-filter-row">
              <div className="transaction-date-range">
                <label className="transaction-date-field">
                  <span>{t.dateFrom}</span>
                  <input type="date" value={dateFrom} onChange={event => setDateFrom(event.currentTarget.value)} />
                </label>
                <label className="transaction-date-field">
                  <span>{t.dateTo}</span>
                  <input type="date" value={dateTo} onChange={event => setDateTo(event.currentTarget.value)} />
                </label>
                {!validDateRange && <p className="transaction-range-error" role="alert">{t.invalidDateRange}</p>}
              </div>
              <div className="transactions-summary-chip">
                <span className="summary-label">
                  {isVi ? 'Tổng hiển thị:' : 'Filtered Net:'}
                </span>
                <strong className={totalFilteredAmount >= 0 ? 'positive' : 'negative'}>
                  {totalFilteredAmount >= 0 ? '+' : ''}{formatVnd(totalFilteredAmount, locale)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ErrorBanner error={error?.message ?? null} locale={locale} />

      {/* Main Table Card */}
      <div className="transactions-table-card panel">
        <div className="table-responsive">
          <table className="modern-data-table">
            <thead>
              <tr>
                <th scope="col" style={{ width: '56px' }}>{isVi ? 'Loại' : 'Type'}</th>
                <th scope="col">{isVi ? 'Mô tả / Danh mục' : 'Description / Category'}</th>
                <th scope="col">{isVi ? 'Ngày giao dịch' : 'Date'}</th>
                <th scope="col" className="text-right">{isVi ? 'Số tiền' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody>
              {groupedTransactions.map(group => (
                <Fragment key={group.key}>
                  <tr key={`group-${group.key}`} className="transaction-group-heading">
                    <th scope="rowgroup" colSpan={4}>{formatTransactionGroupLabel(group.key, grouping, locale)}</th>
                  </tr>
                  {group.transactions.map(tx => {
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
                </Fragment>
              ))}

              {!loading && filteredData.length === 0 && (
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

        {validDateRange && hasMore && !loading && (
          <div className="table-footer-actions">
            <button
              type="button"
              className="secondary-button load-more-btn"
              onClick={() => void loadMore()}
            >
              <span>{isVi ? 'Xem thêm giao dịch cũ hơn' : 'Load more transactions'}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
