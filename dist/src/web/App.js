import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Bell, ChevronDown, CircleHelp, CreditCard, FileText, LayoutDashboard, Leaf, Menu, Moon, Plus, RefreshCw, Settings, Sparkles, Sun, WalletCards, X } from 'lucide-react';
import { apiGet, apiPost, setUnauthorizedHandler } from './api-client.js';
import { formatVnd, formatDate } from './format.js';
import { copy } from './i18n.js';
import { TransactionForm } from './components/TransactionForm.js';
import { TransactionsScreen } from './screens/TransactionsScreen.js';
import { SavingsScreen } from './screens/SavingsScreen.js';
import { ReportsScreen } from './screens/ReportsScreen.js';
import { AdminScreen } from './screens/AdminScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';
export function App() {
    const [locale, setLocale] = useState('vi');
    const [theme, setTheme] = useState('light');
    const [menuOpen, setMenuOpen] = useState(false);
    const [screen, setScreen] = useState('dashboard');
    const [session, setSession] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [state, setState] = useState('loading');
    const [error, setError] = useState('');
    const [formOpen, setFormOpen] = useState(null);
    const t = copy[locale];
    // Configure global unauthorized handler for the API client
    useEffect(() => {
        setUnauthorizedHandler(() => {
            setSession(null);
            setState('unauthenticated');
        });
    }, []);
    async function loadDashboard() {
        if (!session)
            return;
        setState('loading');
        setError('');
        try {
            const data = await apiGet('/reports/dashboard');
            setDashboard(data);
            setState('ready');
        }
        catch (caught) {
            setState('error');
            setError(caught instanceof Error ? caught.message : 'REQUEST_FAILED');
        }
    }
    useEffect(() => {
        apiGet('/auth/session')
            .then((current) => {
            setSession(current);
            setLocale(current.user.locale);
        })
            .catch((caught) => {
            if (caught?.status === 401) {
                setState('unauthenticated');
            }
            else {
                setState('error');
                setError(caught instanceof Error ? caught.message : 'REQUEST_FAILED');
            }
        });
    }, []);
    useEffect(() => {
        if (session)
            void loadDashboard();
    }, [session]);
    async function signOut() {
        if (!session)
            return;
        try {
            await apiPost('/auth/logout', {}, { 'X-CSRF-Token': session.csrfToken });
        }
        catch {
            // ignore
        }
        setSession(null);
        setDashboard(null);
        setState('unauthenticated');
    }
    if (state === 'loading' && !session)
        return _jsx(StateScreen, { title: t.loading, detail: t.loading });
    if (state === 'unauthenticated')
        return _jsx(SignInScreen, { t: t });
    if (!session)
        return _jsx(StateScreen, { title: t.unavailable, detail: error, retry: () => window.location.reload(), retryLabel: t.retry });
    return (_jsxs("div", { className: `app-shell ${theme === 'dark' ? 'theme-dark' : ''}`, lang: locale, children: [_jsxs("aside", { className: `sidebar ${menuOpen ? 'is-open' : ''}`, children: [_jsxs("div", { className: "brand-lockup", children: [_jsx("div", { className: "brand-mark", children: _jsx(Leaf, { size: 20, strokeWidth: 2.5 }) }), _jsxs("span", { children: ["campus", _jsx("span", { children: "coin" })] }), _jsx("button", { className: "icon-button sidebar-close", "aria-label": t.menu, onClick: () => setMenuOpen(false), children: _jsx(X, { size: 18 }) })] }), _jsxs("nav", { "aria-label": "Primary navigation", children: [_jsx("p", { className: "nav-label", children: t.workspace }), _jsx(NavItem, { icon: _jsx(LayoutDashboard, { size: 18 }), label: t.dashboard, active: screen === 'dashboard', onClick: () => setScreen('dashboard') }), _jsx(NavItem, { icon: _jsx(CreditCard, { size: 18 }), label: t.transactions, active: screen === 'transactions', onClick: () => setScreen('transactions') }), _jsx(NavItem, { icon: _jsx(WalletCards, { size: 18 }), label: t.goals, active: screen === 'savings', onClick: () => setScreen('savings') }), _jsx(NavItem, { icon: _jsx(FileText, { size: 18 }), label: t.reports, active: screen === 'reports', onClick: () => setScreen('reports') }), _jsx("p", { className: "nav-label nav-label-spaced", children: t.more }), session.user.role !== 'user' && _jsx(NavItem, { icon: _jsx(CircleHelp, { size: 18 }), label: t.admin, active: screen === 'admin', onClick: () => setScreen('admin') }), _jsx(NavItem, { icon: _jsx(Settings, { size: 18 }), label: t.settings, active: screen === 'settings', onClick: () => setScreen('settings') }), _jsx(NavItem, { icon: _jsx(CircleHelp, { size: 18 }), label: t.help })] }), _jsxs("div", { className: "sidebar-bottom", children: [_jsxs("div", { className: "mini-profile", children: [_jsx("div", { className: "avatar", children: session.user.displayName.substring(0, 2).toUpperCase() }), _jsxs("div", { children: [_jsx("strong", { children: session.user.displayName }), _jsx("small", { children: t.personalAccount })] }), _jsx(ChevronDown, { size: 16 })] }), _jsx("button", { className: "google-link", onClick: () => void signOut(), children: t.signOut })] })] }), _jsxs("main", { className: "main-content", children: [_jsxs("header", { className: "topbar", children: [_jsx("button", { className: "icon-button menu-trigger", "aria-label": t.menu, onClick: () => setMenuOpen(true), children: _jsx(Menu, { size: 21 }) }), _jsxs("div", { className: "breadcrumbs", children: [_jsx("span", { children: t.personal }), _jsx("span", { children: "/" }), _jsx("strong", { children: screen === 'dashboard' ? t.dashboard : screen === 'transactions' ? t.transactions : screen === 'savings' ? t.savings : screen === 'reports' ? t.reports : screen === 'admin' ? t.admin : t.settingsTitle })] }), _jsxs("div", { className: "topbar-actions", children: [_jsxs("span", { className: "preview-badge", children: [_jsx(Sparkles, { size: 14 }), " ", t.preview] }), _jsx("button", { className: "icon-button", "aria-label": "Notifications", children: _jsx(Bell, { size: 19 }) }), _jsx("button", { className: "locale-toggle", onClick: () => setLocale(locale === 'vi' ? 'en' : 'vi'), "aria-label": t.language, children: locale.toUpperCase() }), _jsx("button", { className: "icon-button", onClick: () => setTheme(theme === 'light' ? 'dark' : 'light'), "aria-label": t.appearance, children: theme === 'light' ? _jsx(Moon, { size: 18 }) : _jsx(Sun, { size: 18 }) })] })] }), _jsxs("section", { className: "content-wrap", children: [_jsxs("div", { className: "page-intro", children: [_jsxs("div", { children: [_jsxs("p", { className: "eyebrow", children: [t.thisMonth, " \u00B7 09/2026"] }), _jsx("h1", { children: t.greeting.replace('{name}', session.user.displayName) }), _jsx("p", { className: "muted", children: t.overview })] }), _jsxs("button", { className: "primary-button", onClick: () => setFormOpen('payment'), children: [_jsx(Plus, { size: 18 }), t.addTransaction] })] }), state === 'error' && _jsx(StateScreen, { title: t.unavailable, detail: error, retry: () => void loadDashboard(), retryLabel: t.retry }), state === 'loading' && _jsx("div", { className: "status-panel", role: "status", children: t.loading }), state === 'ready' && screen === 'dashboard' && _jsx(DashboardView, { dashboard: dashboard, locale: locale, t: t, onIncome: () => setFormOpen('income'), onPayment: () => setFormOpen('payment') }), screen === 'transactions' && _jsx(TransactionsScreen, { t: t, locale: locale }), screen === 'savings' && _jsx(SavingsScreen, { csrfToken: session.csrfToken, t: t, locale: locale }), screen === 'reports' && _jsx(ReportsScreen, { csrfToken: session.csrfToken, t: t, locale: locale }), screen === 'admin' && _jsx(AdminScreen, { session: session, csrfToken: session.csrfToken, t: t, locale: locale }), screen === 'settings' && (_jsx(SettingsScreen, { session: session, theme: theme, onThemeChange: setTheme, onSessionUpdate: (newSession) => { setSession(newSession); setLocale(newSession.user.locale); }, t: t, locale: locale })), formOpen && (_jsx(TransactionForm, { kind: formOpen, csrfToken: session.csrfToken, t: t, locale: locale, onClose: () => setFormOpen(null), onSuccess: () => void loadDashboard() }))] })] })] }));
}
function NavItem({ icon, label, active = false, onClick }) {
    return _jsxs("button", { className: `nav-item ${active ? 'active' : ''}`, onClick: onClick, children: [icon, _jsx("span", { children: label }), active && _jsx("span", { className: "active-pip" })] });
}
function StateScreen({ title, detail, retry, retryLabel }) {
    return _jsxs("main", { className: "state-screen", children: [_jsx(Leaf, { size: 30 }), _jsx("h1", { children: title }), _jsx("p", { children: detail }), retry && _jsxs("button", { className: "primary-button", onClick: retry, children: [_jsx(RefreshCw, { size: 16 }), retryLabel] })] });
}
function SignInScreen({ t }) {
    return _jsxs("main", { className: "state-screen sign-in-screen", children: [_jsx("div", { className: "brand-mark", children: _jsx(Leaf, { size: 20 }) }), _jsxs("h1", { children: ["campus", _jsx("span", { children: "coin" })] }), _jsx("p", { children: t.signInDescription }), _jsxs("a", { className: "primary-button", href: "/api/v1/auth/google/start", children: [_jsx("span", { className: "google-dot", children: "G" }), t.signIn] })] });
}
function DashboardView({ dashboard, locale, t, onIncome, onPayment }) {
    const transactions = dashboard?.recentTransactions ?? [];
    return _jsxs(_Fragment, { children: [_jsxs("div", { className: "stats-grid", children: [_jsxs("section", { className: "balance-card stat-card", children: [_jsxs("div", { className: "stat-heading", children: [_jsx("span", { children: t.balance }), _jsx(WalletCards, { size: 18 })] }), _jsx("strong", { children: formatVnd(dashboard?.wallet?.availableBalanceVnd, locale) }), _jsx("p", { className: "muted", children: t.thisMonth })] }), _jsx(StatCard, { label: t.income, value: formatVnd(dashboard?.currentMonth?.totalIncomeVnd, locale), icon: _jsx(ArrowDownLeft, { size: 17 }), tone: "mint" }), _jsx(StatCard, { label: t.spending, value: formatVnd(dashboard?.currentMonth?.totalPaymentVnd, locale), icon: _jsx(ArrowUpRight, { size: 17 }), tone: "coral" }), _jsx(StatCard, { label: t.savings, value: formatVnd(dashboard?.savings?.balanceVnd, locale), icon: _jsx(Leaf, { size: 17 }), tone: "amber" })] }), _jsxs("div", { className: "action-row", children: [_jsxs("button", { className: "secondary-button", onClick: onIncome, children: [_jsx(ArrowDownLeft, { size: 16 }), t.addIncome] }), _jsxs("button", { className: "primary-button", onClick: onPayment, children: [_jsx(ArrowUpRight, { size: 16 }), t.addPayment] })] }), _jsxs("div", { className: "dashboard-grid", children: [_jsxs("section", { className: "panel activity-panel", children: [_jsx("div", { className: "panel-heading", children: _jsxs("div", { children: [_jsx("h2", { children: t.recent }), _jsx("p", { className: "muted", children: t.noData })] }) }), _jsx("div", { className: "transaction-list", children: transactions.length ? transactions.map((transaction) => _jsx(TransactionRow, { transaction: transaction, locale: locale }, transaction.id)) : _jsx("p", { className: "empty-state", children: t.noData }) })] }), _jsx(BudgetPanel, { locale: locale, t: t })] })] });
}
function StatCard({ label, value, icon, tone }) {
    return _jsxs("section", { className: "stat-card", children: [_jsxs("div", { className: "stat-heading", children: [_jsx("span", { children: label }), _jsx("span", { className: `metric-icon ${tone}`, children: icon })] }), _jsx("strong", { children: value })] });
}
function TransactionRow({ transaction, locale }) {
    const isIncome = transaction.type === 'income';
    return (_jsxs("div", { className: "transaction-row", children: [_jsx("div", { className: `transaction-icon ${isIncome ? 'mint' : 'coral'}`, children: isIncome ? _jsx(ArrowDownLeft, { size: 16 }) : _jsx(ArrowUpRight, { size: 16 }) }), _jsxs("div", { className: "transaction-detail", children: [_jsx("strong", { children: transaction.categoryId }), _jsx("span", { children: formatDate(transaction.occurredAt, locale) })] }), _jsxs("strong", { className: isIncome ? 'amount-positive' : '', children: [isIncome ? '+' : '-', formatVnd(transaction.amountVnd, locale)] })] }));
}
function BudgetPanel({ locale, t }) {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const month = new Date().toISOString().slice(0, 7);
                const data = await apiGet(`/budgets/summary?month=${month}`);
                if (active)
                    setSummary(data);
            }
            catch {
                // ignore for now
            }
            finally {
                if (active)
                    setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, []);
    if (loading) {
        return (_jsx("section", { className: "panel budget-panel", children: _jsx("div", { className: "panel-heading", children: _jsxs("div", { children: [_jsx("h2", { children: t.budget }), _jsx("p", { className: "muted", children: t.loading })] }) }) }));
    }
    if (!summary || summary.totalLimitVnd === 0) {
        return (_jsxs("section", { className: "panel budget-panel", children: [_jsx("div", { className: "panel-heading", children: _jsxs("div", { children: [_jsx("h2", { children: t.budget }), _jsx("p", { className: "muted", children: t.unavailable })] }) }), _jsx("div", { className: "empty-state", children: t.noData })] }));
    }
    const pct = Math.min(100, (summary.totalUsedVnd / summary.totalLimitVnd) * 100);
    const isOverrun = summary.totalUsedVnd > summary.totalLimitVnd;
    const strokeColor = isOverrun ? 'var(--coral-500)' : 'var(--mint-500)';
    return (_jsxs("section", { className: "panel budget-panel", children: [_jsx("div", { className: "panel-heading", children: _jsxs("div", { children: [_jsx("h2", { children: t.budget }), _jsx("p", { className: "muted", children: t.thisMonth })] }) }), _jsx("div", { className: "budget-ring-container", children: _jsxs("svg", { viewBox: "0 0 36 36", className: "circular-chart", children: [_jsx("path", { className: "circle-bg", d: "M18 2.0845\n              a 15.9155 15.9155 0 0 1 0 31.831\n              a 15.9155 15.9155 0 0 1 0 -31.831" }), _jsx("path", { className: "circle", strokeDasharray: `${pct}, 100`, stroke: strokeColor, d: "M18 2.0845\n              a 15.9155 15.9155 0 0 1 0 31.831\n              a 15.9155 15.9155 0 0 1 0 -31.831" }), _jsxs("text", { x: "18", y: "20.35", className: "percentage", children: [Math.round(pct), "%"] })] }) }), _jsxs("div", { className: "budget-stats", children: [_jsxs("div", { children: [_jsx("strong", { children: formatVnd(summary.totalUsedVnd, locale) }), _jsx("span", { children: "\u0110\u00E3 d\u00F9ng" })] }), _jsxs("div", { children: [_jsx("strong", { children: formatVnd(summary.totalLimitVnd - summary.totalUsedVnd, locale) }), _jsx("span", { children: t.left })] })] }), summary.exceededCategoryCount > 0 && (_jsxs("p", { className: "budget-note warning", children: [_jsx("span", { className: "status-dot coral" }), locale === 'vi'
                        ? `${summary.exceededCategoryCount} danh mục vượt mức`
                        : `${summary.exceededCategoryCount} categories exceeded`] }))] }));
}
//# sourceMappingURL=App.js.map