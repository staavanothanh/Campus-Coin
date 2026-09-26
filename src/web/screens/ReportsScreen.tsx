import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../api-client.js';
import type { MonthlyReport, Budget, Locale, CategoryTotal } from '../types.js';
import type { Copy } from '../i18n.js';
import { formatVnd, getCurrentMonth } from '../format.js';
import { MonthPicker } from '../components/MonthPicker.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { BudgetForm } from '../components/BudgetForm.js';
import {
  Edit2,
  AlertTriangle,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  Sparkles,
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface ReportsScreenProps {
  csrfToken: string;
  t: Copy;
  locale: Locale;
}

export function ReportsScreen({ csrfToken, t, locale }: ReportsScreenProps) {
  const isVi = locale === 'vi';
  const [month, setMonth] = useState<string>(getCurrentMonth());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [editBudgetCategory, setEditBudgetCategory] = useState<{ id: string; limit: number | null } | null>(null);

  const loadData = useCallback(async (targetMonth: string) => {
    setLoading(true);
    setError(null);
    try {
      const [reportData, budgetsData] = await Promise.all([
        apiGet<MonthlyReport>(`/reports/monthly?month=${targetMonth}`),
        apiGet<Budget[]>(`/budgets?month=${targetMonth}`),
      ]);
      setReport(reportData);
      setBudgets(budgetsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load reports'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(month);
  }, [month, loadData]);

  const handleBudgetSuccess = () => {
    void loadData(month);
  };

  const hasData =
    report &&
    (report.totalIncomeVnd > 0 ||
      report.totalPaymentVnd > 0 ||
      report.categoryBreakdown.length > 0);

  const maxBarValue = report
    ? Math.max(report.totalIncomeVnd, report.totalPaymentVnd, 1)
    : 1;
  const incomePct = report ? (report.totalIncomeVnd / maxBarValue) * 100 : 0;
  const paymentPct = report ? (report.totalPaymentVnd / maxBarValue) * 100 : 0;
  const netSavings = report ? report.totalIncomeVnd - report.totalPaymentVnd : 0;

  // Process category breakdown for pie chart
  let pieSegments: Array<{
    category: CategoryTotal;
    percentage: number;
    dashArray: string;
    dashOffset: string;
    color: string;
  }> = [];
  const palette = ['#36856e', '#f59e0b', '#f0b15b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

  if (report && report.categoryBreakdown.length > 0) {
    const totalBreakdown = report.categoryBreakdown.reduce((sum, cat) => sum + cat.amountVnd, 0) || 1;
    let currentOffset = 0;
    const sortedCategories = [...report.categoryBreakdown].sort((a, b) => b.amountVnd - a.amountVnd);

    pieSegments = sortedCategories.map((cat, index) => {
      const pct = (cat.amountVnd / totalBreakdown) * 100;
      const dashArray = `${pct} ${100 - pct}`;
      const dashOffset = `${100 - currentOffset + 25}`;
      currentOffset += pct;

      return {
        category: cat,
        percentage: Math.round(pct),
        dashArray,
        dashOffset,
        color: palette[index % palette.length]!
      };
    });
  }

  const getBudgetForCategory = (categoryId: string) =>
    budgets.find(b => b.categoryId === categoryId);

  return (
    <div className="reports-page">
      {/* Top Header Card */}
      <div className="reports-header-panel panel">
        <div className="reports-header-title">
          <h2>{t.reports}</h2>
          <p className="muted">
            {isVi
              ? 'Phân tích chi tiết thu chi và theo dõi ngân sách theo tháng'
              : 'Detailed cash flow breakdown and monthly budget tracking'}
          </p>
        </div>

        <div className="reports-header-controls">
          <MonthPicker month={month} onChange={setMonth} locale={locale} />
        </div>
      </div>

      <ErrorBanner error={error?.message ?? null} locale={locale} />

      {loading ? (
        <div className="status-panel" role="status">
          <div className="table-loading-bar">
            <span>{t.loading}</span>
          </div>
        </div>
      ) : !hasData ? (
        <div className="empty-state panel">
          <Calendar size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <p>{t.noData}</p>
        </div>
      ) : (
        <div className="reports-content-grid">
          {/* KPI Summary Cards */}
          <div className="reports-kpi-grid">
            <div className="kpi-card mint">
              <div className="kpi-icon"><TrendingUp size={20} /></div>
              <div className="kpi-details">
                <span className="kpi-label">{t.income}</span>
                <strong>+{formatVnd(report.totalIncomeVnd, locale)}</strong>
              </div>
            </div>

            <div className="kpi-card coral">
              <div className="kpi-icon"><TrendingDown size={20} /></div>
              <div className="kpi-details">
                <span className="kpi-label">{t.spending}</span>
                <strong>-{formatVnd(report.totalPaymentVnd, locale)}</strong>
              </div>
            </div>

            <div className="kpi-card amber">
              <div className="kpi-icon"><Wallet size={20} /></div>
              <div className="kpi-details">
                <span className="kpi-label">{isVi ? 'Thặng dư tháng' : 'Net Savings'}</span>
                <strong className={netSavings >= 0 ? 'positive' : 'negative'}>
                  {netSavings >= 0 ? '+' : ''}{formatVnd(netSavings, locale)}
                </strong>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="reports-charts-row">
            {/* Overview Bar Chart */}
            <div className="chart-card panel">
              <div className="chart-card-header">
                <div className="chart-header-icon mint"><BarChart3 size={18} /></div>
                <div>
                  <h3>{isVi ? 'Tương quan Thu - Chi' : 'Income vs Payment Overview'}</h3>
                  <p className="muted">{isVi ? 'So sánh dòng tiền trong tháng' : 'Monthly cash flow comparison'}</p>
                </div>
              </div>

              <div className="bar-chart-container" aria-hidden="true">
                <div className="bar-row">
                  <div className="bar-info">
                    <span className="bar-label">{t.income}</span>
                    <strong className="bar-val positive">+{formatVnd(report.totalIncomeVnd, locale)}</strong>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill mint" style={{ width: `${Math.max(incomePct, 2)}%` }} />
                  </div>
                </div>

                <div className="bar-row">
                  <div className="bar-info">
                    <span className="bar-label">{t.spending}</span>
                    <strong className="bar-val negative">-{formatVnd(report.totalPaymentVnd, locale)}</strong>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill coral" style={{ width: `${Math.max(paymentPct, 2)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown Pie Chart */}
            <div className="chart-card panel">
              <div className="chart-card-header">
                <div className="chart-header-icon amber"><PieIcon size={18} /></div>
                <div>
                  <h3>{isVi ? 'Cơ cấu chi tiêu' : 'Spending Breakdown'}</h3>
                  <p className="muted">{isVi ? 'Tỷ trọng chi tiêu theo từng danh mục' : 'Expense distribution by category'}</p>
                </div>
              </div>

              <div className="pie-chart-layout">
                <div className="pie-chart-container" aria-hidden="true">
                  <svg viewBox="0 0 32 32" className="pie-chart">
                    {pieSegments.map(segment => (
                      <circle
                        key={segment.category.categoryId}
                        r="15.9155"
                        cx="16"
                        cy="16"
                        fill="transparent"
                        stroke={segment.color}
                        strokeWidth="32"
                        strokeDasharray={segment.dashArray}
                        strokeDashoffset={segment.dashOffset}
                      />
                    ))}
                  </svg>
                </div>

                <div className="pie-legend">
                  {pieSegments.map(segment => (
                    <div key={segment.category.categoryId} className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: segment.color }} />
                      <div className="legend-texts">
                        <div className="legend-name-row">
                          <span className="legend-label">{segment.category.categoryId}</span>
                          <span className="legend-pct">{segment.percentage}%</span>
                        </div>
                        <span className="legend-value">{formatVnd(segment.category.amountVnd, locale)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Budgets Table */}
          <div className="reports-budgets-card panel">
            <div className="panel-heading">
              <div>
                <h3>{t.budget}</h3>
                <p className="muted">{isVi ? 'Theo dõi hạn mức ngân sách từng danh mục' : 'Category monthly spending limits'}</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="modern-data-table">
                <thead>
                  <tr>
                    <th scope="col">{isVi ? 'Danh mục' : 'Category'}</th>
                    <th scope="col" className="text-right">{isVi ? 'Đã chi' : 'Spent'}</th>
                    <th scope="col" className="text-right">{isVi ? 'Hạn mức ngân sách' : 'Budget Limit'}</th>
                    <th scope="col">{isVi ? 'Tiến độ' : 'Progress'}</th>
                    <th scope="col">{isVi ? 'Trạng thái' : 'Status'}</th>
                    <th scope="col" className="text-center">{isVi ? 'Thiết lập' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.categoryBreakdown.map(cat => {
                    const budget = getBudgetForCategory(cat.categoryId);
                    const isOverrun = budget?.isOverrun;
                    const usedPct = budget && budget.limitVnd > 0
                      ? Math.min(Math.round((cat.amountVnd / budget.limitVnd) * 100), 100)
                      : 0;

                    return (
                      <tr key={cat.categoryId} className="transaction-table-row">
                        <td>
                          <strong className="tx-category-tag">{cat.categoryId}</strong>
                        </td>
                        <td className="text-right">
                          <strong className="negative">-{formatVnd(cat.amountVnd, locale)}</strong>
                        </td>
                        <td className="text-right">
                          {budget ? formatVnd(budget.limitVnd, locale) : <span className="muted">—</span>}
                        </td>
                        <td>
                          {budget ? (
                            <div className="budget-bar-cell">
                              <div className="budget-bar-track">
                                <div
                                  className={`budget-bar-fill ${isOverrun ? 'overrun' : 'ok'}`}
                                  style={{ width: `${usedPct}%` }}
                                />
                              </div>
                              <span className="budget-bar-pct">{usedPct}%</span>
                            </div>
                          ) : (
                            <span className="muted">{isVi ? 'Chưa đặt hạn mức' : 'No limit'}</span>
                          )}
                        </td>
                        <td>
                          {isOverrun ? (
                            <span className="status-badge warning">
                              <AlertTriangle size={12} />
                              <span>{isVi ? 'Vượt mức' : 'Exceeded'}</span>
                            </span>
                          ) : budget ? (
                            <span className="status-badge success">
                              <CheckCircle2 size={12} />
                              <span>{isVi ? 'Trong mức' : 'On track'}</span>
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="icon-button edit-budget-btn"
                            onClick={() =>
                              setEditBudgetCategory({
                                id: cat.categoryId,
                                limit: budget?.limitVnd ?? null,
                              })
                            }
                            title={isVi ? `Sửa ngân sách ${cat.categoryId}` : `Edit budget for ${cat.categoryId}`}
                          >
                            <Edit2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editBudgetCategory && (
        <BudgetForm
          categoryId={editBudgetCategory.id}
          month={month}
          initialLimitVnd={editBudgetCategory.limit}
          csrfToken={csrfToken}
          t={t}
          locale={locale}
          onClose={() => setEditBudgetCategory(null)}
          onSuccess={handleBudgetSuccess}
        />
      )}
    </div>
  );
}
