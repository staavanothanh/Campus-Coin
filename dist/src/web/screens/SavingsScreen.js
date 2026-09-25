import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { usePagination } from '../hooks/use-pagination.js';
import { apiGet } from '../api-client.js';
import { formatVnd, formatDate } from '../format.js';
import { ArrowDownLeft, ArrowUpRight, Leaf, Plus, Minus } from 'lucide-react';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { SavingsTransferForm } from '../components/SavingsTransferForm.js';
export function SavingsScreen({ csrfToken, t, locale }) {
    const [balance, setBalance] = useState(null);
    const [balanceLoading, setBalanceLoading] = useState(true);
    const [balanceError, setBalanceError] = useState(null);
    const [formOpen, setFormOpen] = useState(null);
    const { data: transfers, loading: transfersLoading, error: transfersError, hasMore, loadMore, reload } = usePagination('/savings/transfers?limit=20');
    const loadBalance = async () => {
        setBalanceLoading(true);
        setBalanceError(null);
        try {
            const data = await apiGet('/savings');
            setBalance(data);
        }
        catch (err) {
            setBalanceError(err instanceof Error ? err : new Error('Failed to load balance'));
        }
        finally {
            setBalanceLoading(false);
        }
    };
    useEffect(() => {
        void loadBalance();
        void reload();
    }, [reload]);
    const handleSuccess = () => {
        void loadBalance();
        void reload();
    };
    return (_jsxs("div", { className: "dashboard-grid", children: [_jsxs("section", { className: "panel", children: [_jsxs("div", { className: "panel-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: t.savings }), _jsx("p", { className: "muted", children: t.savingsTransfer })] }), _jsxs("div", { className: "action-row", children: [_jsxs("button", { className: "primary-button", onClick: () => setFormOpen('deposit'), children: [_jsx(Plus, { size: 16 }), " ", locale === 'vi' ? 'Gửi' : 'Deposit'] }), _jsxs("button", { className: "secondary-button", onClick: () => setFormOpen('withdraw'), children: [_jsx(Minus, { size: 16 }), " ", locale === 'vi' ? 'Rút' : 'Withdraw'] })] })] }), _jsx("div", { className: "stats-grid", style: { gridTemplateColumns: '1fr', marginBottom: 'var(--space-6)' }, children: _jsxs("section", { className: "balance-card stat-card", style: { background: 'var(--amber-muted)' }, children: [_jsxs("div", { className: "stat-heading", children: [_jsx("span", { children: t.balance }), _jsx(Leaf, { size: 18, className: "amber" })] }), _jsx("strong", { children: balanceLoading
                                        ? '...'
                                        : balanceError
                                            ? t.unavailable
                                            : formatVnd(balance?.balanceVnd, locale) })] }) }), _jsx(ErrorBanner, { error: transfersError?.message ?? null, locale: locale }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: "Lo\u1EA1i" }), _jsx("th", { scope: "col", children: "Ng\u00E0y" }), _jsx("th", { scope: "col", children: "Ghi ch\u00FA" }), _jsx("th", { scope: "col", className: "text-right", children: "S\u1ED1 ti\u1EC1n" })] }) }), _jsxs("tbody", { children: [transfers.map((tx) => {
                                            const isDeposit = tx.direction === 'deposit';
                                            return (_jsxs("tr", { children: [_jsx("td", { children: _jsx("div", { className: `transaction-icon ${isDeposit ? 'mint' : 'coral'}`, "aria-label": isDeposit ? 'Gửi tiền' : 'Rút tiền', children: isDeposit ? _jsx(ArrowDownLeft, { size: 16 }) : _jsx(ArrowUpRight, { size: 16 }) }) }), _jsx("td", { children: formatDate(tx.createdAt, locale) }), _jsx("td", { children: tx.note ?? '' }), _jsxs("td", { className: `text-right ${isDeposit ? 'amount-positive' : 'amount-negative'}`, children: [isDeposit ? '+' : '-', formatVnd(tx.amountVnd, locale)] })] }, tx.id));
                                        }), !transfersLoading && transfers.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "empty-state", children: t.noData }) }))] })] }) }), transfersLoading && _jsx("div", { className: "status-panel", role: "status", children: t.loading }), hasMore && !transfersLoading && (_jsx("div", { className: "action-row", children: _jsx("button", { className: "secondary-button", onClick: () => void loadMore(), children: t.more }) }))] }), formOpen && (_jsx(SavingsTransferForm, { direction: formOpen, csrfToken: csrfToken, t: t, locale: locale, onClose: () => setFormOpen(null), onSuccess: handleSuccess }))] }));
}
//# sourceMappingURL=SavingsScreen.js.map