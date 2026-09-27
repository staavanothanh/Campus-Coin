import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Edit2, PieChart, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { apiRequest, errorMessage } from '../api.js';
import { currentMonthKey, formatMonth, formatVnd } from '../format.js';
import type { Budget, Copy, Locale, MonthlyReport } from '../types.js';
import { BudgetForm } from '../components/BudgetForm.js';

export function ReportsScreen({ csrfToken, t, locale }: { csrfToken: string; t: Copy; locale: Locale }) {
  const [month, setMonth] = useState(() => currentMonthKey());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; status: string; appliesTo: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editCategory, setEditCategory] = useState<{ id: string; limit: number | null } | null>(null);

  const loadData = useCallback(async (targetMonth: string) => {
    setLoading(true);
    setError('');
    try {
      const [nextReport, nextBudgets, nextCategories] = await Promise.all([
        apiRequest<MonthlyReport>(`/reports/monthly?month=${encodeURIComponent(targetMonth)}`),
        apiRequest<Budget[]>(`/budgets?month=${encodeURIComponent(targetMonth)}`),
        apiRequest<Array<{ id: string; status: string; appliesTo: string }>>('/categories?appliesTo=payment'),
      ]);
      setReport(nextReport);
      setBudgets(nextBudgets);
      setCategories(nextCategories);
    } catch (caught) {
      setError(errorMessage(caught, t));
      setReport(null);
      setBudgets([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => { void loadData(month); }, [month, loadData]);

  const [year, monthNumber] = month.split('-').map(Number);
  function shiftMonth(amount: number) {
    const date = new Date(Date.UTC(year ?? 2000, (monthNumber ?? 1) - 1 + amount, 1));
    setMonth(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  const maxBar = report ? Math.max(report.totalIncomeVnd, report.totalPaymentVnd, 1) : 1;
  const totalSpending = report?.categoryBreakdown.reduce((sum, item) => sum + item.amountVnd, 0) ?? 0;
  const segments = report?.categoryBreakdown.map((item, index) => ({ ...item, color: ['#36856e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'][index % 5] })) ?? [];
  const gradient = segments.reduce((state, item) => {
    const start = state.offset;
    const end = start + (totalSpending > 0 ? item.amountVnd / totalSpending * 100 : 0);
    return { offset: end, stops: [...state.stops, `${item.color} ${start}% ${end}%`] };
  }, { offset: 0, stops: [] as string[] });
  const hasData = (report !== null && (report.totalIncomeVnd > 0 || report.totalPaymentVnd > 0 || report.categoryBreakdown.length > 0)) || budgets.length > 0;


  return <div className="reports-page">
    <section className="reports-header-panel panel"><div><h2>{t.reports}</h2><p className="muted">{locale === 'vi' ? 'Tổng hợp thu chi và hạn mức theo tháng' : 'Monthly income, spending, and budget overview'}</p></div><div className="month-control"><button type="button" className="icon-button" aria-label={locale === 'vi' ? 'Tháng trước' : 'Previous month'} onClick={() => shiftMonth(-1)}><ChevronLeft size={18} /></button><strong>{formatMonth(month, locale)}</strong><button type="button" className="icon-button" aria-label={locale === 'vi' ? 'Tháng sau' : 'Next month'} onClick={() => shiftMonth(1)}><ChevronRight size={18} /></button></div></section>
    {error && <p role="alert" className="form-message">{error}</p>}
    {loading ? <div className="status-panel" role="status">{t.loading}</div> : !hasData ? <div className="empty-state panel"><Calendar size={32} /><p>{t.noData}</p></div> : <div className="reports-content-grid">
      {report && <>
      <div className="reports-kpi-grid"><div className="kpi-card mint"><TrendingUp size={20} /><div><span>{t.income}</span><strong>+{formatVnd(report.totalIncomeVnd, locale)}</strong></div></div><div className="kpi-card coral"><TrendingDown size={20} /><div><span>{t.spending}</span><strong>-{formatVnd(report.totalPaymentVnd, locale)}</strong></div></div><div className="kpi-card amber"><Wallet size={20} /><div><span>{t.netSavings}</span><strong className={report.totalIncomeVnd >= report.totalPaymentVnd ? 'positive' : 'negative'}>{formatVnd(report.totalIncomeVnd - report.totalPaymentVnd, locale)}</strong></div></div></div>
      <div className="reports-charts-row"><section className="chart-card panel"><div className="chart-card-header"><BarChart3 size={18} /><div><h3>{locale === 'vi' ? 'Thu và chi' : 'Income and spending'}</h3><p className="muted">{formatMonth(month, locale)}</p></div></div><div className="bar-chart-container"><div className="bar-row"><div className="bar-info"><span>{t.income}</span><strong>{formatVnd(report.totalIncomeVnd, locale)}</strong></div><div className="bar-track"><span className="bar-fill mint" style={{ width: `${report.totalIncomeVnd / maxBar * 100}%` }} /></div></div><div className="bar-row"><div className="bar-info"><span>{t.spending}</span><strong>{formatVnd(report.totalPaymentVnd, locale)}</strong></div><div className="bar-track"><span className="bar-fill coral" style={{ width: `${report.totalPaymentVnd / maxBar * 100}%` }} /></div></div></div></section>
        <section className="chart-card panel"><div className="chart-card-header"><PieChart size={18} /><div><h3>{t.categoryBreakdown}</h3><p className="muted">{locale === 'vi' ? 'Theo danh mục giao dịch' : 'By transaction category'}</p></div></div>{segments.length ? <div className="pie-chart-layout"><div className="pie-chart" aria-hidden="true" style={{ background: `conic-gradient(${gradient.stops.join(', ')})` }} /><ul className="pie-legend">{segments.map(item => <li key={item.categoryId}><span className="legend-color" style={{ backgroundColor: item.color }} /><span>{item.categoryId}</span><strong>{formatVnd(item.amountVnd, locale)}</strong></li>)}</ul></div> : <p className="empty-state">{t.noData}</p>}</section></div>
      </>}
      <section className="reports-budgets-card panel"><div className="panel-heading"><div><h3>{t.budget}</h3><p className="muted">{formatMonth(month, locale)}</p></div></div><div className="table-responsive"><table className="modern-data-table"><thead><tr><th>{t.category}</th><th className="text-right">{t.spent}</th><th className="text-right">{t.budgetLimit}</th><th>{t.progress}</th><th>{t.status}</th><th>{t.action}</th></tr></thead><tbody>{report ? [...new Set([...report.categoryBreakdown.map(item => item.categoryId), ...budgets.map(item => item.categoryId)])].map(categoryId => { const categoryTotal = report.categoryBreakdown.find(item => item.categoryId === categoryId); const usedVnd = categoryTotal?.amountVnd ?? 0; const budget = budgets.find(entry => entry.categoryId === categoryId); const percent = budget?.limitVnd ? Math.min(usedVnd / budget.limitVnd * 100, 100) : 0; return <tr key={categoryId}><td>{categoryId}</td><td className="text-right">{formatVnd(usedVnd, locale)}</td><td className="text-right">{budget ? formatVnd(budget.limitVnd, locale) : '—'}</td><td><div className="budget-bar-track"><span className={`budget-bar-fill ${budget?.isOverrun ? 'overrun' : 'ok'}`} style={{ width: `${percent}%` }} /></div></td><td>{budget?.isOverrun ? <span className="status-badge warning"><AlertTriangle size={12} />{locale === 'vi' ? 'Vượt mức' : 'Exceeded'}</span> : budget ? <span className="status-badge success"><CheckCircle2 size={12} />{locale === 'vi' ? 'Trong mức' : 'On track'}</span> : '—'}</td><td><button type="button" className="icon-button" aria-label={`${locale === 'vi' ? 'Sửa ngân sách' : 'Edit budget'} ${categoryId}`} onClick={() => setEditCategory({ id: categoryId, limit: budget?.limitVnd ?? null })}><Edit2 size={15} /></button></td></tr>; }) : budgets.map(budget => <tr key={budget.categoryId}><td>{budget.categoryId}</td><td className="text-right">{formatVnd(budget.usedVnd, locale)}</td><td className="text-right">{formatVnd(budget.limitVnd, locale)}</td><td>—</td><td>{budget.isOverrun ? (locale === 'vi' ? 'Vượt mức' : 'Exceeded') : (locale === 'vi' ? 'Trong mức' : 'On track')}</td><td><button type="button" className="icon-button" onClick={() => setEditCategory({ id: budget.categoryId, limit: budget.limitVnd })}>{t.action}</button></td></tr>)}{report?.categoryBreakdown.length === 0 && budgets.length === 0 && <tr><td colSpan={6} className="empty-state">{t.noData}</td></tr>}</tbody></table></div>{categories.some(category => category.status === 'active' && !budgets.some(budget => budget.categoryId === category.id)) && <label className="new-budget-category">{t.category}<select value="" onChange={event => { const id = event.target.value; if (id) setEditCategory({ id, limit: null }); }}><option value="">{t.selectCategory}</option>{categories.filter(category => category.status === 'active' && !budgets.some(budget => budget.categoryId === category.id)).map(category => <option key={category.id} value={category.id}>{category.id}</option>)}</select></label>}</section>
    </div>}
    {editCategory && <BudgetForm categoryId={editCategory.id} month={month} initialLimitVnd={editCategory.limit} csrfToken={csrfToken} t={t} locale={locale} onClose={() => setEditCategory(null)} onSuccess={() => { setEditCategory(null); void loadData(month); }} />}
  </div>;
}
