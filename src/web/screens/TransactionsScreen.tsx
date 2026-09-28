import { useEffect, useState } from 'react';
import { usePagination } from '../hooks/use-pagination.js';
import { useCategories } from '../hooks/use-categories.js';
import type { Transaction, Locale } from '../types.js';
import type { Copy } from '../i18n.js';
import { CorrectionModal } from '../components/CorrectionModal.js';
import { formatVnd, formatDate } from '../format.js';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  CreditCard,
  Calendar,
  Search,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { ErrorBanner } from '../components/ErrorBanner.js';

interface TransactionsScreenProps {
  t: Copy;
  locale: Locale;
  csrfToken: string;
}

export function TransactionsScreen({ t, locale, csrfToken }: TransactionsScreenProps) {
  const isVi = locale === 'vi';
  const { categories, getCategoryName } = useCategories();
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'payment'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [correctionMessage, setCorrectionMessage] = useState('');

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

  const correctedTargetIds = new Set(
    data.flatMap(tx => tx.role !== 'original' && tx.referenceId ? [tx.referenceId] : []),
  );

  function closeCorrection() {
    setSelectedTransaction(null);
  }

  function handleCorrectionCreated() {
    setSelectedTransaction(null);
    setCorrectionMessage(isVi
      ? 'Đã ghi đính chính; giao dịch gốc vẫn được giữ trong lịch sử.'
      : 'Correction recorded; the original transaction stays in the history.');
    void reload();
  }

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
              {isVi ? 'Giao dịch đang hiển thị:' : 'Transactions shown:'}
            </span>
            <strong aria-live="polite">
              {error
                ? (isVi ? 'Không khả dụng' : 'Unavailable')
                  : loading
                    ? t.loading
                  : new Intl.NumberFormat(isVi ? 'vi-VN' : 'en-US').format(filteredData.length)}
            </strong>
          </div>
        </div>
      </div>

      <ErrorBanner error={error?.message ?? null} locale={locale} />
      {correctionMessage && <p className="status-panel" role="status">{correctionMessage}</p>}
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
                <th scope="col">{isVi ? 'Đính chính' : 'Correction'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(tx => {
                const isIncome = tx.type === 'income';
                const isCorrection = tx.role !== 'original';
                const correctionLabel = tx.role === 'reversal'
                  ? (isVi ? 'Đã đảo' : 'Reversed')
                  : tx.role === 'adjustment'
                    ? (isVi ? 'Đã điều chỉnh' : 'Adjusted')
                    : (isVi ? 'Đã thay thế' : 'Replaced');
                return (
                  <tr key={tx.id} className="transaction-table-row">
                    <td>
                      <div
                        className={`tx-type-badge ${isCorrection ? 'amber' : isIncome ? 'mint' : 'coral'}`}
                        title={isCorrection ? correctionLabel : isIncome ? t.income : t.spending}
                      >
                        {isCorrection
                          ? <RotateCcw size={16} />
                          : isIncome ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                    </td>
                    <td>
                      <div className="tx-details">
                        <strong className="tx-category-tag">{getCategoryName(tx.categoryId, locale)}</strong>
                        {tx.itemName && <span className="tx-note">{tx.itemName}</span>}
                        {tx.description && (
                          <span className="tx-note">{tx.description}</span>
                        )}
                        {isCorrection && (
                          <span className="tx-note">
                            {correctionLabel}
                            {tx.referenceId ? ` · ${isVi ? 'giao dịch' : 'transaction'} #${tx.referenceId}` : ''}
                          </span>
                        )}
                        {!isCorrection && correctedTargetIds.has(tx.id) && (
                          <span className="tx-note">
                            {isVi ? 'Đã có đính chính trong lịch sử' : 'A correction is recorded in history'}
                          </span>
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
                      {isCorrection ? (
                        <div>
                          <strong className="tx-amount">{formatVnd(tx.amountVnd, locale)}</strong>
                          <span className="tx-note">
                            {tx.role === 'reversal'
                              ? (isVi ? 'Số tiền được đảo' : 'Reversed amount')
                              : (isVi ? 'Số tiền sau đính chính' : 'Corrected amount')}
                          </span>
                        </div>
                      ) : (
                        <strong className={`tx-amount ${isIncome ? 'positive' : 'negative'}`}>
                          {isIncome ? '+' : '-'}{formatVnd(tx.amountVnd, locale)}
                        </strong>
                      )}
                    </td>
                    <td>
                      {tx.role === 'original' && !correctedTargetIds.has(tx.id)
                        ? (
                          <button
                            type="button"
                            className="secondary-button"
                            aria-label={`${isVi ? 'Đính chính giao dịch' : 'Correct transaction'} ${tx.id}`}
                            onClick={() => {
                              setCorrectionMessage('');
                              setSelectedTransaction(tx);
                            }}
                          >
                            {isVi ? 'Đính chính' : 'Correct'}
                          </button>
                        )
                        : tx.role !== 'original'
                          ? <span className="muted">{isVi ? 'Đã ghi' : 'Recorded'}</span>
                          : null}
                    </td>
                  </tr>
                );
              })}

              {!loading && !error && filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">
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
      {selectedTransaction && (
        <CorrectionModal
          transaction={selectedTransaction}
          categories={categories}
          csrfToken={csrfToken}
          locale={locale}
          t={t}
          onClose={closeCorrection}
          onCreated={handleCorrectionCreated}
        />
      )}
    </div>
  );
}
