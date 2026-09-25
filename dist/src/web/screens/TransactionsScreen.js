import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { usePagination } from '../hooks/use-pagination.js';
import { formatVnd, formatDate } from '../format.js';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { ErrorBanner } from '../components/ErrorBanner.js';
export function TransactionsScreen({ t, locale }) {
    const [typeFilter, setTypeFilter] = useState('all');
    const basePath = `/ledger/transactions?limit=20${typeFilter !== 'all' ? `&type=${typeFilter}` : ''}`;
    const { data, loading, error, hasMore, loadMore, reload } = usePagination(basePath);
    // Reload when filter changes
    useEffect(() => {
        void reload();
    }, [typeFilter, reload]);
    return (_jsxs("section", { className: "feature-panel panel", children: [_jsxs("div", { className: "panel-heading", children: [_jsx("div", { children: _jsx("h2", { children: t.transactions }) }), _jsx("div", { className: "filters", children: _jsxs("select", { value: typeFilter, onChange: (e) => setTypeFilter(e.target.value), "aria-label": "L\u1ECDc theo lo\u1EA1i giao d\u1ECBch", children: [_jsx("option", { value: "all", children: "T\u1EA5t c\u1EA3" }), _jsx("option", { value: "income", children: t.income }), _jsx("option", { value: "payment", children: t.spending })] }) })] }), _jsx(ErrorBanner, { error: error?.message ?? null, locale: locale }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: "Lo\u1EA1i" }), _jsx("th", { scope: "col", children: "Ng\u00E0y" }), _jsx("th", { scope: "col", children: "Danh m\u1EE5c" }), _jsx("th", { scope: "col", className: "text-right", children: "S\u1ED1 ti\u1EC1n" })] }) }), _jsxs("tbody", { children: [data.map((tx) => {
                                    const isIncome = tx.type === 'income';
                                    return (_jsxs("tr", { children: [_jsx("td", { children: _jsx("div", { className: `transaction-icon ${isIncome ? 'mint' : 'coral'}`, "aria-label": isIncome ? t.income : t.spending, children: isIncome ? _jsx(ArrowDownLeft, { size: 16 }) : _jsx(ArrowUpRight, { size: 16 }) }) }), _jsx("td", { children: formatDate(tx.occurredAt, locale) }), _jsx("td", { children: tx.categoryId }), _jsxs("td", { className: `text-right ${isIncome ? 'amount-positive' : 'amount-negative'}`, children: [isIncome ? '+' : '-', formatVnd(tx.amountVnd, locale)] })] }, tx.id));
                                }), !loading && data.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "empty-state", children: t.noData }) }))] })] }) }), loading && _jsx("div", { className: "status-panel", role: "status", children: t.loading }), hasMore && !loading && (_jsx("div", { className: "action-row", children: _jsx("button", { className: "secondary-button", onClick: () => void loadMore(), children: t.more }) }))] }));
}
//# sourceMappingURL=TransactionsScreen.js.map