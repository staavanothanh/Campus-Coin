import { useEffect, useState } from 'react';
import { apiGet } from '../api-client.js';
import type { MonthlyReport, Budget, Locale, CategoryTotal } from '../types.js';
import type { Copy } from '../i18n.js';
import { formatVnd, getCurrentMonth } from '../format.js';
import { MonthPicker } from '../components/MonthPicker.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { BudgetForm } from '../components/BudgetForm.js';
import { Edit2, AlertTriangle } from 'lucide-react';

interface ReportsScreenProps {
  csrfToken: string;
  t: Copy;
  locale: Locale;
}

export function ReportsScreen({ csrfToken, t, locale }: ReportsScreenProps) {
  const [month, setMonth] = useState<string>(getCurrentMonth());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const [editBudgetCategory, setEditBudgetCategory] = useState<{ id: string, limit: number | null } | null>(null);

  const loadData = async (targetMonth: string) => {
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
  };

  useEffect(() => {
    void loadData(month);
  }, [month]);

  const handleBudgetSuccess = () => {
    void loadData(month);
  };

  const hasData = report && (report.totalIncomeVnd > 0 || report.totalPaymentVnd > 0 || report.categoryBreakdown.length > 0);
  
  // Calculate max values for bar chart
  const maxBarValue = report ? Math.max(report.totalIncomeVnd, report.totalPaymentVnd) : 0;
  const incomePct = maxBarValue > 0 ? (report!.totalIncomeVnd / maxBarValue) * 100 : 0;
  const paymentPct = maxBarValue > 0 ? (report!.totalPaymentVnd / maxBarValue) * 100 : 0;

  // Process category breakdown for pie chart
  let pieSegments: Array<{ category: CategoryTotal, dashArray: string, dashOffset: string, color: string }> = [];
  const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#6366f1'];
  
  if (report && report.categoryBreakdown.length > 0) {
    const totalBreakdown = report.categoryBreakdown.reduce((sum, cat) => sum + cat.amountVnd, 0);
    let currentOffset = 0;
    
    // Sort by amount descending
    const sortedCategories = [...report.categoryBreakdown].sort((a, b) => b.amountVnd - a.amountVnd);
    
    pieSegments = sortedCategories.map((cat, index) => {
      // Circumference of circle with r=15.9155 is 100
      const percentage = (cat.amountVnd / totalBreakdown) * 100;
      const dashArray = `${percentage} ${100 - percentage}`;
      const dashOffset = `${100 - currentOffset + 25}`; // +25 to start at top
      currentOffset += percentage;
      
      return {
        category: cat,
        dashArray,
        dashOffset,
        color: colors[index % colors.length]!
      };
    });
  }

  const getBudgetForCategory = (categoryId: string) => budgets.find(b => b.categoryId === categoryId);

  return (
    <div className="dashboard-grid">
      <section className="panel" style={{ gridColumn: '1 / -1' }}>
        <div className="panel-heading">
          <h2>{t.reports}</h2>
          <MonthPicker month={month} onChange={setMonth} locale={locale} />
        </div>

        <ErrorBanner error={error?.message ?? null} locale={locale} />

        {loading ? (
          <div className="status-panel" role="status">{t.loading}</div>
        ) : !hasData ? (
          <div className="empty-state">{t.noData}</div>
        ) : (
          <div className="reports-layout">
            
            {/* Overview Bar Chart */}
            <div className="report-section">
              <h3>{locale === 'vi' ? 'Tổng quan thu chi' : 'Income vs Payment Overview'}</h3>
              <div className="bar-chart-container" aria-hidden="true">
                <div className="bar-row">
                  <span className="bar-label">{t.income}</span>
                  <div className="bar-track">
                    <div className="bar-fill mint" style={{ width: `${incomePct}%` }}></div>
                  </div>
                  <span className="bar-value">{formatVnd(report.totalIncomeVnd, locale)}</span>
                </div>
                <div className="bar-row">
                  <span className="bar-label">{t.spending}</span>
                  <div className="bar-track">
                    <div className="bar-fill coral" style={{ width: `${paymentPct}%` }}></div>
                  </div>
                  <span className="bar-value">{formatVnd(report.totalPaymentVnd, locale)}</span>
                </div>
              </div>
              
              {/* Screen reader table equivalent */}
              <table className="visually-hidden">
                <caption>{locale === 'vi' ? 'Dữ liệu tổng quan thu chi' : 'Income vs Payment Data'}</caption>
                <thead>
                  <tr><th>Loại</th><th>Số tiền</th></tr>
                </thead>
                <tbody>
                  <tr><td>{t.income}</td><td>{formatVnd(report.totalIncomeVnd, locale)}</td></tr>
                  <tr><td>{t.spending}</td><td>{formatVnd(report.totalPaymentVnd, locale)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Category Breakdown Pie Chart */}
            <div className="report-section">
              <h3>{locale === 'vi' ? 'Cơ cấu chi tiêu' : 'Spending Breakdown'}</h3>
              
              <div className="pie-chart-layout">
                <div className="pie-chart-container" aria-hidden="true">
                  <svg viewBox="0 0 32 32" className="pie-chart">
                    {pieSegments.map((segment) => (
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
                  {pieSegments.map((segment) => (
                    <div key={segment.category.categoryId} className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: segment.color }}></span>
                      <span className="legend-label">{segment.category.categoryId}</span>
                      <span className="legend-value">{formatVnd(segment.category.amountVnd, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Screen reader table equivalent */}
              <table className="visually-hidden">
                <caption>{locale === 'vi' ? 'Dữ liệu cơ cấu chi tiêu' : 'Spending Breakdown Data'}</caption>
                <thead>
                  <tr><th>Danh mục</th><th>Số tiền</th></tr>
                </thead>
                <tbody>
                  {report.categoryBreakdown.map(cat => (
                    <tr key={cat.categoryId}>
                      <td>{cat.categoryId}</td>
                      <td>{formatVnd(cat.amountVnd, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Budgets Table */}
            <div className="report-section" style={{ gridColumn: '1 / -1', marginTop: 'var(--space-6)' }}>
              <h3>{t.budget}</h3>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Danh mục</th>
                      <th scope="col" className="text-right">Đã chi</th>
                      <th scope="col" className="text-right">Ngân sách</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col" className="text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.categoryBreakdown.map(cat => {
                      const budget = getBudgetForCategory(cat.categoryId);
                      const isOverrun = budget?.isOverrun;
                      
                      return (
                        <tr key={cat.categoryId}>
                          <td>{cat.categoryId}</td>
                          <td className="text-right">{formatVnd(cat.amountVnd, locale)}</td>
                          <td className="text-right">
                            {budget ? formatVnd(budget.limitVnd, locale) : <span className="muted">—</span>}
                          </td>
                          <td>
                            {isOverrun ? (
                              <span className="badge warning">
                                <AlertTriangle size={12} /> {locale === 'vi' ? 'Vượt mức' : 'Exceeded'}
                              </span>
                            ) : budget ? (
                              <span className="badge success">{locale === 'vi' ? 'Trong mức' : 'On track'}</span>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td className="text-center">
                            <button 
                              className="icon-button" 
                              onClick={() => setEditBudgetCategory({ id: cat.categoryId, limit: budget?.limitVnd ?? null })}
                              aria-label={locale === 'vi' ? `Thiết lập ngân sách cho ${cat.categoryId}` : `Set budget for ${cat.categoryId}`}
                            >
                              <Edit2 size={16} />
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
      </section>

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
