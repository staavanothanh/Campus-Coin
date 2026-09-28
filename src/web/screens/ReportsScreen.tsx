import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, BarChart3, Calendar, CheckCircle2, Edit2, PieChart, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { apiRequest, errorMessage } from '../api.js';
import { currentMonthKey, formatMonth, formatVnd } from '../format.js';
import { formatCategoryName } from '../category-names.js';
import { BudgetForm } from '../components/BudgetForm.js';
import { MonthPicker } from '../components/MonthPicker.js';
import { useCategories } from '../hooks/use-categories.js';
import type { Budget, Category, Copy, Locale, MonthlyReport } from '../types.js';

const CHART_COLORS = ['#36856e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

type EditCategory = { id: string; limit: number | null };

export function ReportsScreen({ csrfToken, t, locale }: { csrfToken: string; t: Copy; locale: Locale }) {
  const { categories: allCategories, hasError: categoryLoadFailed, isLoading: categoriesLoading, retry: retryCategories } = useCategories();
  const categories = allCategories.filter(category => category.appliesTo === 'payment');
  const [month, setMonth] = useState(() => currentMonthKey());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetsLoaded, setBudgetsLoaded] = useState(false);
  const [reportLoaded, setReportLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editCategory, setEditCategory] = useState<EditCategory | null>(null);
  const reportHeadingRef = useRef<HTMLHeadingElement>(null);
  const budgetSectionRef = useRef<HTMLElement>(null);
  const requestGeneration = useRef(0);

  const loadData = useCallback(async (targetMonth: string) => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setError('');
    setNotice('');
    setReportLoaded(false);
    setReport(null);
    setBudgets([]);
    setBudgetsLoaded(false);
    const [reportResult, budgetsResult] = await Promise.allSettled([
      apiRequest<MonthlyReport>(`/reports/monthly?month=${encodeURIComponent(targetMonth)}`),
      apiRequest<Budget[]>(`/budgets?month=${encodeURIComponent(targetMonth)}`),
    ]);
    if (generation !== requestGeneration.current || activeMonth.current.key !== targetMonth) return;
    setReport(reportResult.status === 'fulfilled' ? reportResult.value : null);
    setReportLoaded(reportResult.status === 'fulfilled');
    setBudgets(budgetsResult.status === 'fulfilled' ? budgetsResult.value : []);
    setBudgetsLoaded(budgetsResult.status === 'fulfilled');
    setError([
      reportResult.status === 'rejected' ? errorMessage(reportResult.reason, t) : '',
      budgetsResult.status === 'rejected' ? errorMessage(budgetsResult.reason, t) : '',
    ].filter(Boolean).join(' '));
    setLoading(false);
  }, [t]);

  const activeMonth = useRef({ key: month });
  activeMonth.current = { key: month };
  useEffect(() => { void loadData(month); }, [month, loadData]);


  const maxBar = report ? Math.max(report.totalIncomeVnd, report.totalPaymentVnd, 1) : 1;
  const totalSpending = report?.categoryBreakdown.reduce((sum, item) => sum + item.amountVnd, 0) ?? 0;
  const segments = report?.categoryBreakdown.map((item, index) => ({ ...item, color: CHART_COLORS[index % CHART_COLORS.length] })) ?? [];
  const gradient = segments.reduce((state, item) => {
    const start = state.offset;
    const end = start + (totalSpending > 0 ? item.amountVnd / totalSpending * 100 : 0);
    return { offset: end, stops: [...state.stops, `${item.color} ${start}% ${end}%`] };
  }, { offset: 0, stops: [] as string[] });
  const hasReportData = report !== null && (report.totalIncomeVnd > 0 || report.totalPaymentVnd > 0 || report.categoryBreakdown.length > 0);

  function editBudget(categoryId: string, limit: number | null) {
    setEditCategory({ id: categoryId, limit });
  }

  function handleBudgetSuccess() {
    setEditCategory(null);
    void loadData(month).finally(() => setNotice(locale === 'vi' ? 'Đã cập nhật ngân sách.' : 'Budget updated.'));
  }

  return <div className="reports-page">
    <section className="reports-header-panel panel">
      <div>
        <h2 id="report-heading" ref={reportHeadingRef} tabIndex={-1}>{t.reports}</h2>
      </div>
      <MonthPicker month={month} onChange={setMonth} locale={locale} />
    </section>
    {notice && <p className="form-message" role="status">{notice}</p>}
    {(loading || error) && <div className="form-message">{error && <span role="alert">{error}</span>}<button type="button" className="secondary-button" aria-label={`${t.retry}: ${t.reports}`} disabled={loading} onClick={() => void loadData(month)}>{t.retry}</button></div>}
    {loading && <section className="status-panel" role="status" aria-busy="true">{t.loading}</section>}
    <div className="reports-content-grid" aria-busy={loading}>
      {!loading && hasReportData && report && <>
        <div className="reports-kpi-grid">
          <div className="kpi-card mint"><TrendingUp size={20} /><div><span>{t.income}</span><strong>+{formatVnd(report.totalIncomeVnd, locale)}</strong></div></div>
          <div className="kpi-card coral"><TrendingDown size={20} /><div><span>{t.spending}</span><strong>-{formatVnd(report.totalPaymentVnd, locale)}</strong></div></div>
          <div className="kpi-card amber"><Wallet size={20} /><div><span>{t.netSavings}</span><strong className={report.totalIncomeVnd >= report.totalPaymentVnd ? 'positive' : 'negative'}>{formatVnd(report.totalIncomeVnd - report.totalPaymentVnd, locale)}</strong></div></div>
        </div>
        <div className="reports-charts-row">
          <section className="chart-card panel">
            <div className="chart-card-header"><BarChart3 size={18} /><div><h3>{locale === 'vi' ? 'Thu và chi' : 'Income and spending'}</h3><p className="muted">{formatMonth(month, locale)}</p></div></div>
            <div className="bar-chart-container">
              <div className="bar-row"><div className="bar-info"><span>{t.income}</span><strong>{formatVnd(report.totalIncomeVnd, locale)}</strong></div><div className="bar-track"><span className="bar-fill mint" style={{ width: `${report.totalIncomeVnd / maxBar * 100}%` }} /></div></div>
              <div className="bar-row"><div className="bar-info"><span>{t.spending}</span><strong>{formatVnd(report.totalPaymentVnd, locale)}</strong></div><div className="bar-track"><span className="bar-fill coral" style={{ width: `${report.totalPaymentVnd / maxBar * 100}%` }} /></div></div>
            </div>
          </section>
          <section className="chart-card panel">
            <div className="chart-card-header"><PieChart size={18} /><div><h3>{t.categoryBreakdown}</h3><p className="muted">{locale === 'vi' ? 'Theo danh mục giao dịch' : 'By transaction category'}</p></div></div>
            {segments.length ? <div className="pie-chart-layout"><div className="pie-chart" aria-hidden="true" style={{ background: `conic-gradient(${gradient.stops.join(', ')})` }} /><ul className="pie-legend">{segments.map(item => <li key={item.categoryId}><span className="legend-color" style={{ backgroundColor: item.color }} /><span>{formatCategoryName(item.categoryId, categories, locale)}</span><strong>{formatVnd(item.amountVnd, locale)}</strong></li>)}</ul></div> : <p className="empty-state">{t.noData}</p>}
          </section>
        </div>
      </>}
      {!loading && reportLoaded && !hasReportData && <div className="empty-state panel"><Calendar size={32} /><p>{t.noData}</p></div>}
      {!loading && budgetsLoaded && <BudgetTable ref={budgetSectionRef} report={report} reportLoaded={reportLoaded} budgets={budgets} categories={categories} locale={locale} t={t} onEdit={editBudget} />}
    </div>
    {editCategory && <BudgetForm categoryId={editCategory.id} categoryName={formatCategoryName(editCategory.id, categories, locale)} month={month} initialLimitVnd={editCategory.limit} csrfToken={csrfToken} t={t} locale={locale} restoreFocusRef={reportHeadingRef} onClose={() => setEditCategory(null)} onSuccess={handleBudgetSuccess} />}
  </div>;
}

const BudgetTable = React.forwardRef<HTMLElement, {
  report: MonthlyReport | null;
  budgets: Budget[];
  categories: Category[];
  locale: Locale;
  reportLoaded: boolean;
  t: Copy;
  onEdit(categoryId: string, limit: number | null): void;
}>(function BudgetTable({ report, reportLoaded, budgets, categories, locale, t, onEdit }, forwardedRef) {
  const sectionRef = useRef<HTMLElement>(null);
  React.useImperativeHandle(forwardedRef, () => sectionRef.current!);
  const categoryIds = [...new Set([...(report?.categoryBreakdown.map(item => item.categoryId) ?? []), ...budgets.map(item => item.categoryId)])];
  const unbudgetedCategories = categories.filter(category => category.status === 'active' && !budgets.some(budget => budget.categoryId === category.id));

  return <section ref={sectionRef} tabIndex={-1} className="reports-budgets-card panel">
    <div className="panel-heading"><div><h3>{t.budget}</h3><p className="muted">{report ? formatMonth(report.month, locale) : t.noData}</p></div></div>
    <div className="table-responsive"><table className="modern-data-table">
      <thead><tr><th scope="col">{t.category}</th><th scope="col" className="text-right">{t.spent}</th><th scope="col" className="text-right">{t.budgetLimit}</th><th scope="col">{t.progress}</th><th scope="col">{t.status}</th><th scope="col">{t.action}</th></tr></thead>
      <tbody>
        {categoryIds.map(categoryId => {
          const usedVnd = reportLoaded ? report?.categoryBreakdown.find(item => item.categoryId === categoryId)?.amountVnd ?? 0 : null;
          const budget = budgets.find(item => item.categoryId === categoryId);
          const percent = budget && usedVnd !== null ? budget.limitVnd === 0 ? (usedVnd > 0 ? 100 : 0) : Math.min(usedVnd / budget.limitVnd * 100, 100) : 0;
          const categoryName = formatCategoryName(categoryId, categories, locale);
          return <tr key={categoryId}>
            <td>{categoryName}</td><td className="text-right">{usedVnd !== null ? formatVnd(usedVnd, locale) : '—'}</td><td className="text-right">{budget ? formatVnd(budget.limitVnd, locale) : '—'}</td>
            <td>{budget && usedVnd !== null ? <div className="budget-bar-track" role="progressbar" aria-label={`${categoryName} ${t.progress}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><span className={`budget-bar-fill ${budget.isOverrun ? 'overrun' : 'ok'}`} style={{ width: `${percent}%` }} /></div> : '—'}</td>
            <td>{!reportLoaded ? '—' : budget?.isOverrun ? <span className="status-badge warning"><AlertTriangle size={12} />{locale === 'vi' ? 'Vượt mức' : 'Exceeded'}</span> : budget ? <span className="status-badge success"><CheckCircle2 size={12} />{locale === 'vi' ? 'Trong mức' : 'On track'}</span> : '—'}</td>
            <td><button type="button" className="icon-button" aria-label={`${locale === 'vi' ? 'Sửa ngân sách' : 'Edit budget'} ${categoryName}`} onClick={() => onEdit(categoryId, budget?.limitVnd ?? null)}><Edit2 size={15} aria-hidden="true" /></button></td>
          </tr>;
        })}
        {!categoryIds.length && <tr><td colSpan={6} className="empty-state">{t.noData}</td></tr>}
      </tbody>
    </table></div>
    {reportLoaded && unbudgetedCategories.length > 0 && <label className="new-budget-category">{t.category}<select value="" onChange={event => { const categoryId = event.target.value; if (categoryId) onEdit(categoryId, null); }}><option value="">{t.selectCategory}</option>{unbudgetedCategories.map(category => <option key={category.id} value={category.id}>{formatCategoryName(category.id, categories, locale)}</option>)}</select></label>}
  </section>;
});
