import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { apiGet } from '../api-client.js';
import { formatVnd, getCurrentMonth } from '../format.js';
import { MonthPicker } from '../components/MonthPicker.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { BudgetForm } from '../components/BudgetForm.js';
import { Edit2, AlertTriangle } from 'lucide-react';
export function ReportsScreen({ csrfToken, t, locale }) {
    const [month, setMonth] = useState(getCurrentMonth());
    const [report, setReport] = useState(null);
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editBudgetCategory, setEditBudgetCategory] = useState(null);
    const loadData = async (targetMonth) => {
        setLoading(true);
        setError(null);
        try {
            const [reportData, budgetsData] = await Promise.all([
                apiGet(`/reports/monthly?month=${targetMonth}`),
                apiGet(`/budgets?month=${targetMonth}`),
            ]);
            setReport(reportData);
            setBudgets(budgetsData);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load reports'));
        }
        finally {
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
    const incomePct = maxBarValue > 0 ? (report.totalIncomeVnd / maxBarValue) * 100 : 0;
    const paymentPct = maxBarValue > 0 ? (report.totalPaymentVnd / maxBarValue) * 100 : 0;
    // Process category breakdown for pie chart
    let pieSegments = [];
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
                color: colors[index % colors.length]
            };
        });
    }
    const getBudgetForCategory = (categoryId) => budgets.find(b => b.categoryId === categoryId);
    return (_jsxs("div", { className: "dashboard-grid", children: [_jsxs("section", { className: "panel", style: { gridColumn: '1 / -1' }, children: [_jsxs("div", { className: "panel-heading", children: [_jsx("h2", { children: t.reports }), _jsx(MonthPicker, { month: month, onChange: setMonth, locale: locale })] }), _jsx(ErrorBanner, { error: error?.message ?? null, locale: locale }), loading ? (_jsx("div", { className: "status-panel", role: "status", children: t.loading })) : !hasData ? (_jsx("div", { className: "empty-state", children: t.noData })) : (_jsxs("div", { className: "reports-layout", children: [_jsxs("div", { className: "report-section", children: [_jsx("h3", { children: locale === 'vi' ? 'Tổng quan thu chi' : 'Income vs Payment Overview' }), _jsxs("div", { className: "bar-chart-container", "aria-hidden": "true", children: [_jsxs("div", { className: "bar-row", children: [_jsx("span", { className: "bar-label", children: t.income }), _jsx("div", { className: "bar-track", children: _jsx("div", { className: "bar-fill mint", style: { width: `${incomePct}%` } }) }), _jsx("span", { className: "bar-value", children: formatVnd(report.totalIncomeVnd, locale) })] }), _jsxs("div", { className: "bar-row", children: [_jsx("span", { className: "bar-label", children: t.spending }), _jsx("div", { className: "bar-track", children: _jsx("div", { className: "bar-fill coral", style: { width: `${paymentPct}%` } }) }), _jsx("span", { className: "bar-value", children: formatVnd(report.totalPaymentVnd, locale) })] })] }), _jsxs("table", { className: "visually-hidden", children: [_jsx("caption", { children: locale === 'vi' ? 'Dữ liệu tổng quan thu chi' : 'Income vs Payment Data' }), _jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Lo\u1EA1i" }), _jsx("th", { children: "S\u1ED1 ti\u1EC1n" })] }) }), _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("td", { children: t.income }), _jsx("td", { children: formatVnd(report.totalIncomeVnd, locale) })] }), _jsxs("tr", { children: [_jsx("td", { children: t.spending }), _jsx("td", { children: formatVnd(report.totalPaymentVnd, locale) })] })] })] })] }), _jsxs("div", { className: "report-section", children: [_jsx("h3", { children: locale === 'vi' ? 'Cơ cấu chi tiêu' : 'Spending Breakdown' }), _jsxs("div", { className: "pie-chart-layout", children: [_jsx("div", { className: "pie-chart-container", "aria-hidden": "true", children: _jsx("svg", { viewBox: "0 0 32 32", className: "pie-chart", children: pieSegments.map((segment) => (_jsx("circle", { r: "15.9155", cx: "16", cy: "16", fill: "transparent", stroke: segment.color, strokeWidth: "32", strokeDasharray: segment.dashArray, strokeDashoffset: segment.dashOffset }, segment.category.categoryId))) }) }), _jsx("div", { className: "pie-legend", children: pieSegments.map((segment) => (_jsxs("div", { className: "legend-item", children: [_jsx("span", { className: "legend-color", style: { backgroundColor: segment.color } }), _jsx("span", { className: "legend-label", children: segment.category.categoryId }), _jsx("span", { className: "legend-value", children: formatVnd(segment.category.amountVnd, locale) })] }, segment.category.categoryId))) })] }), _jsxs("table", { className: "visually-hidden", children: [_jsx("caption", { children: locale === 'vi' ? 'Dữ liệu cơ cấu chi tiêu' : 'Spending Breakdown Data' }), _jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Danh m\u1EE5c" }), _jsx("th", { children: "S\u1ED1 ti\u1EC1n" })] }) }), _jsx("tbody", { children: report.categoryBreakdown.map(cat => (_jsxs("tr", { children: [_jsx("td", { children: cat.categoryId }), _jsx("td", { children: formatVnd(cat.amountVnd, locale) })] }, cat.categoryId))) })] })] }), _jsxs("div", { className: "report-section", style: { gridColumn: '1 / -1', marginTop: 'var(--space-6)' }, children: [_jsx("h3", { children: t.budget }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: "Danh m\u1EE5c" }), _jsx("th", { scope: "col", className: "text-right", children: "\u0110\u00E3 chi" }), _jsx("th", { scope: "col", className: "text-right", children: "Ng\u00E2n s\u00E1ch" }), _jsx("th", { scope: "col", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { scope: "col", className: "text-center", children: "H\u00E0nh \u0111\u1ED9ng" })] }) }), _jsx("tbody", { children: report.categoryBreakdown.map(cat => {
                                                        const budget = getBudgetForCategory(cat.categoryId);
                                                        const isOverrun = budget?.isOverrun;
                                                        return (_jsxs("tr", { children: [_jsx("td", { children: cat.categoryId }), _jsx("td", { className: "text-right", children: formatVnd(cat.amountVnd, locale) }), _jsx("td", { className: "text-right", children: budget ? formatVnd(budget.limitVnd, locale) : _jsx("span", { className: "muted", children: "\u2014" }) }), _jsx("td", { children: isOverrun ? (_jsxs("span", { className: "badge warning", children: [_jsx(AlertTriangle, { size: 12 }), " ", locale === 'vi' ? 'Vượt mức' : 'Exceeded'] })) : budget ? (_jsx("span", { className: "badge success", children: locale === 'vi' ? 'Trong mức' : 'On track' })) : (_jsx("span", { className: "muted", children: "\u2014" })) }), _jsx("td", { className: "text-center", children: _jsx("button", { className: "icon-button", onClick: () => setEditBudgetCategory({ id: cat.categoryId, limit: budget?.limitVnd ?? null }), "aria-label": locale === 'vi' ? `Thiết lập ngân sách cho ${cat.categoryId}` : `Set budget for ${cat.categoryId}`, children: _jsx(Edit2, { size: 16 }) }) })] }, cat.categoryId));
                                                    }) })] }) })] })] }))] }), editBudgetCategory && (_jsx(BudgetForm, { categoryId: editBudgetCategory.id, month: month, initialLimitVnd: editBudgetCategory.limit, csrfToken: csrfToken, t: t, locale: locale, onClose: () => setEditBudgetCategory(null), onSuccess: handleBudgetSuccess }))] }));
}
//# sourceMappingURL=ReportsScreen.js.map