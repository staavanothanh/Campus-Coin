import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { App as AuthApp } from '../app/App.js';
import { isCategoryId, retryPayloadAfterTransactionFailure, serializeTransactionPayload, serializeWalletBaseline, type TransactionPayload, type WalletBaselinePayload } from './amount-vnd.js';
import {
  ArrowDownLeft, ArrowUpRight, CircleHelp, CreditCard, FileText, LayoutDashboard, Leaf, LogOut,
  Menu, Moon, RefreshCw, Settings, Sun, WalletCards, X
} from 'lucide-react';
import { apiRequest, setUnauthorizedHandler, type RequestError } from './api.js';
import { copy } from './i18n.js';
import { formatCategoryName } from './category-names.js';
import { currentMonthKey, formatDate, formatVnd } from './format.js';
import { AdminScreen } from './screens/AdminScreen.js';
import { HelpScreen } from './screens/HelpScreen.js';
import { ReportsScreen } from './screens/ReportsScreen.js';
import { SavingsScreen } from './screens/SavingsScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';
import { TransactionsScreen } from './screens/TransactionsScreen.js';
import { useCategories } from './hooks/use-categories.js';
import { useDialogFocus } from './use-dialog-focus.js';
import type { AuthenticatedSession, Budget, BudgetSummary, Category, Copy, Dashboard, Locale, Screen, Session, Theme, Transaction } from './types.js';
import '../styles/main.css';
import './styles.css';

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authIdentity, setAuthIdentity] = useState<{ userId: string; locale: string } | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [authError, setAuthError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [loginNoticeKind, setLoginNoticeKind] = useState<'status' | 'error'>('status');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dashboardState, setDashboardState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dashboardError, setDashboardError] = useState('');
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [theme, setTheme] = useState<Theme>('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => window.innerWidth > 800);
  const [formKind, setFormKind] = useState<'income' | 'payment' | null>(null);
  const [notice, setNotice] = useState('');
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);
  const [locale, setLocale] = useState<Locale>('vi');
  const t = copy[locale];
  const sessionGeneration = useRef(0);
  const currentUserId = useRef<string | null>(null);
  currentUserId.current = authIdentity?.userId ?? null;

  useEffect(() => {
    sessionGeneration.current += 1;
    setDashboard(null);
    setDashboardState(authIdentity ? 'loading' : 'ready');
    setDashboardError('');
  }, [authIdentity?.userId]);

  useEffect(() => setUnauthorizedHandler(() => {
    sessionGeneration.current += 1;
    currentUserId.current = null;
    setAuthIdentity(null);
    setSession(null);
    setDashboard(null);
    setMenuOpen(false);
    setAuthState('ready');
  }), []);
  useEffect(() => { if (!session) return; setLocale(session.user.locale === 'en' ? 'en' : 'vi'); }, [session]);
  useEffect(() => {
    if (!menuOpen || isDesktopViewport || !session) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const currentSidebar: HTMLElement = sidebar;
    sidebar.querySelector<HTMLElement>('.sidebar-close')?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(currentSidebar.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) {
        event.preventDefault();
        currentSidebar.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!currentSidebar.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (menuTriggerRef.current?.isConnected) menuTriggerRef.current.focus();
    };
  }, [menuOpen, isDesktopViewport, session]);
  function toggleSidebar() {
    if (window.innerWidth <= 800) setMenuOpen(previous => !previous);
    else setSidebarCollapsed(previous => !previous);
  }
  useEffect(() => {
    const resetSidebarForViewport = () => {
      const isDesktop = window.innerWidth > 800;
      setIsDesktopViewport(isDesktop);
      if (isDesktop) setMenuOpen(false);
      else setSidebarCollapsed(false);
    };
    window.addEventListener('resize', resetSidebarForViewport);
    return () => window.removeEventListener('resize', resetSidebarForViewport);
  }, []);
  const handleAuthenticated = useCallback((nextSession: AuthenticatedSession | null) => {
    sessionGeneration.current += 1;
    currentUserId.current = nextSession?.user.id ?? null;
    const normalized = nextSession === null ? null : { ...nextSession, googleLinked: null };
    setSession(normalized);
    setAuthIdentity(nextSession ? { userId: nextSession.user.id, locale: nextSession.user.locale } : null);
    setDashboard(null);
    setDashboardState('loading');
    setDashboardError('');
    setLocale(nextSession?.user.locale === 'en' ? 'en' : 'vi');
    setAuthState('ready');
    setLoginNotice('');
    setNotice('');
    if (!nextSession) setMenuOpen(false);
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest<Session>('/auth/session').then(current => {
      if (!current.csrfToken) throw new Error('Invalid session response');
      if (!active) return;
      setSession(current);
      setAuthIdentity({ userId: current.user.id, locale: current.user.locale });
      setLocale(current.user.locale === 'en' ? 'en' : 'vi');
      setAuthState('ready');
    }).catch(caught => {
      if (!active) return;
      if ((caught as RequestError).status === 401) {
        setSession(null);
        setMenuOpen(false);
        setAuthState('ready');
        return;
      }
      setAuthError(copy.vi.unavailable);
      setAuthState('error');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const success = query.get('auth');
    const failure = query.get('auth_error');
    if (!success && !failure) return;
    const successText: Record<string, string> = { google_login: 'Đăng nhập Google thành công.', google_linked: 'Đã kết nối tài khoản Google.' };
    const errorText: Record<string, string> = {
      cancelled: 'Bạn đã hủy đăng nhập Google.', invalid_flow: 'Không thể xác minh tài khoản Google. Vui lòng thử lại.',
      provider_error: 'Không thể xác minh tài khoản Google. Vui lòng thử lại.', provider_unavailable: 'Đăng nhập Google chưa được cấu hình.',
      link_required: 'Email này đã có tài khoản. Hãy đăng nhập bằng phương thức hiện có rồi kết nối Google.',
      account_conflict: 'Tài khoản Google đã được kết nối với tài khoản khác.', login_required: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi kết nối Google.',
      rate_limited: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.', failed: 'Không thể xác minh tài khoản Google. Vui lòng thử lại.'
    };
    setLoginNoticeKind(failure ? 'error' : 'status');
    setLoginNotice(failure ? errorText[failure] ?? errorText.failed ?? copy.vi.unavailable : success ? successText[success] ?? copy.vi.unavailable : copy.vi.unavailable);
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const loadDashboard = useCallback(async (currentSession: Session) => {
    const generation = sessionGeneration.current;
    const userId = currentSession.user.id;
    setDashboardState('loading');
    setDashboardError('');
    try {
      const result = await apiRequest<Dashboard>('/reports/dashboard');
      if (sessionGeneration.current !== generation || currentUserId.current !== userId) return null;
      setDashboard(result);
      setDashboardState('ready');
      return result;
    } catch (caught) {
      if (sessionGeneration.current !== generation || currentUserId.current !== userId) return null;
      const requestError = caught as RequestError;
      if (requestError.status === 401) {
        setSession(null);
        setDashboard(null);
        setMenuOpen(false);
        setAuthState('ready');
      }
      setDashboardError(requestError.status === 403 ? t.forbidden : t.unavailable);
      setDashboardState('error');
      return null;
    }
  }, [t.forbidden, t.unavailable]);
  useEffect(() => { if (session) void loadDashboard(session); }, [session, loadDashboard]);

  function showRequestError(caught: unknown): string {
    const requestError = caught as RequestError;
    if (requestError.status === 401) return t.sessionExpired;
    if (requestError.status === 403) return t.forbidden;
    if (requestError.code === 'VALIDATION_ERROR' || requestError.code === 'DOMAIN_VALIDATION_ERROR') return t.validationError;
    return requestError.status && requestError.status < 500 ? requestError.message : t.requestFailed;
  }

  async function signOut() {
    if (!session) return;
    setNotice('');
    try {
      await apiRequest('/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': session.csrfToken } });
      handleAuthenticated(null);
    } catch (caught) {
      setNotice((caught as RequestError).status === 401 ? t.sessionExpired : t.signOutFailed);
    }
  }

  if (authState === 'loading') return <StateScreen title={t.loading} detail={t.loading} />;
  if (authState === 'error') return <StateScreen title={t.unavailable} detail={authError} retry={() => window.location.reload()} retryLabel={t.retry} />;
  if (!session) return <AuthApp onAuthenticated={handleAuthenticated} initialNotice={loginNotice} noticeKind={loginNoticeKind} />;

  const navItems = [
    { id: 'dashboard' as const, icon: <LayoutDashboard size={18} />, label: t.dashboard },
    { id: 'transactions' as const, icon: <CreditCard size={18} />, label: t.transactions },
    { id: 'savings' as const, icon: <WalletCards size={18} />, label: t.goals },
    { id: 'reports' as const, icon: <FileText size={18} />, label: t.reports },
    ...(session.user.role === 'admin' ? [{ id: 'admin' as const, icon: <CircleHelp size={18} />, label: t.admin }] : []),
    { id: 'settings' as const, icon: <Settings size={18} />, label: t.settings },
    { id: 'help' as const, icon: <CircleHelp size={18} />, label: t.help },
  ];
  const pageLabel = navItems.find(item => item.id === screen)?.label ?? t.dashboard;
  const monthLabel = dashboard?.currentMonth?.month ?? currentMonthKey();

  return <div className={`app-shell ${theme === 'dark' ? 'theme-dark' : ''}`} lang={locale}>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>{locale === 'vi' ? 'Tới nội dung chính' : 'Skip to main content'}</a>
    {menuOpen && !isDesktopViewport && <button className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-label={t.close} />}
    <aside ref={sidebarRef} id="app-sidebar" className={`sidebar ${menuOpen ? 'is-open' : ''} ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
      <div className="brand-lockup"><div className="brand-mark"><Leaf size={20} strokeWidth={2.5} /></div><span className="brand-text">campus<span>coin</span></span><button type="button" className="icon-button sidebar-close" aria-label={t.close} onClick={() => setMenuOpen(false)}><X size={18} /></button></div>
      <nav aria-label={t.primaryNavigation}><p className="nav-label">{t.workspace}</p>{navItems.map(item => <button key={item.id} type="button" className={`nav-item ${screen === item.id ? 'active' : ''}`} aria-label={item.label} title={sidebarCollapsed ? item.label : undefined} onClick={() => { setScreen(item.id); setMenuOpen(false); }} aria-current={screen === item.id ? 'page' : undefined}>{item.icon}<span>{item.label}</span>{screen === item.id && <span className="active-pip" aria-hidden="true" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="mini-profile"><div className="avatar" aria-hidden="true">{session.user.displayName.slice(0, 1).toUpperCase()}</div><div><strong>{session.user.displayName}</strong><small>{session.user.email}</small></div></div><button type="button" className="google-link" onClick={() => void signOut()} aria-label={t.signOut} title={sidebarCollapsed ? t.signOut : undefined}><LogOut size={15} /><span>{t.signOut}</span></button></div>
    </aside>
    <main id="main-content" tabIndex={-1} inert={menuOpen && !isDesktopViewport} className={`main-content ${sidebarCollapsed ? 'is-expanded' : ''}`}><header className="topbar">
      <button ref={menuTriggerRef} type="button" className="icon-button menu-trigger" aria-controls="app-sidebar" aria-label={isDesktopViewport ? (sidebarCollapsed ? (locale === 'vi' ? 'Mở rộng thanh điều hướng' : 'Expand sidebar') : (locale === 'vi' ? 'Thu gọn thanh điều hướng' : 'Collapse sidebar')) : t.menu} aria-expanded={isDesktopViewport ? !sidebarCollapsed : menuOpen} onClick={toggleSidebar}><Menu size={21} /></button>
      <div className="breadcrumbs"><span>{t.personal}</span><span aria-hidden="true">/</span><strong>{pageLabel}</strong></div>
      <div className="topbar-actions"><button type="button" className="locale-toggle" onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')} aria-label={t.language}>{locale.toUpperCase()}</button><button type="button" className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={t.appearance}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button></div>
    </header>{notice && <p role="alert" className="form-message shell-notice">{notice}</p>}
    <section className="content-wrap">
      {screen === 'dashboard' ? <>
        <div className="page-intro"><div><p className="eyebrow">{t.thisMonth} · {monthLabel}</p><h1>{t.greeting}, {session.user.displayName}</h1><p className="muted">{t.overview}</p></div>{dashboard?.wallet && <button type="button" className="primary-button" onClick={() => setFormKind('payment')}><ArrowUpRight size={16} />{t.addTransaction}</button>}</div>
        {dashboardState === 'loading' && <div className="status-panel" role="status">{t.loading}</div>}
        {dashboardState === 'error' && <div className="status-panel"><p role="alert">{dashboardError}</p><button type="button" className="secondary-button" aria-label={`${t.retry}: ${t.dashboard}`} onClick={() => session && void loadDashboard(session)}><RefreshCw size={16} aria-hidden="true" />{t.retry}</button></div>}
        {dashboardState === 'ready' && dashboard?.wallet === null && <WalletBaseline csrfToken={session.csrfToken} t={t} onComplete={async () => { const refreshed = await loadDashboard(session); if (!refreshed) throw new Error(t.requestFailed); }} onError={showRequestError} />}
        {dashboardState === 'ready' && dashboard?.wallet !== null && dashboard && <DashboardView dashboard={dashboard} locale={locale} t={t} onIncome={() => setFormKind('income')} onPayment={() => setFormKind('payment')} onSetBudget={() => setScreen('reports')} budgetRefreshKey={budgetRefreshKey} />}
        {formKind && <TransactionForm kind={formKind} csrfToken={session.csrfToken} locale={locale} t={t} onClose={() => setFormKind(null)} onCommitted={async () => { const refreshed = await loadDashboard(session); setBudgetRefreshKey(key => key + 1); return refreshed ? t.submitSuccess : t.refreshFailed; }} onError={showRequestError} />}
      </> : <>
        <div className="page-intro"><div><p className="eyebrow">{t.workspace}</p><h1>{pageLabel}</h1><p className="muted">{t.recentDescription}</p></div></div>
        {screen === 'transactions' && <TransactionsScreen t={t} locale={locale} />}
        {screen === 'savings' && <SavingsScreen session={session} t={t} locale={locale} />}
        {screen === 'reports' && <ReportsScreen csrfToken={session.csrfToken} t={t} locale={locale} />}
        {screen === 'admin' && <AdminScreen session={session} t={t} locale={locale} />}
        {screen === 'settings' && <SettingsScreen session={session} theme={theme} onThemeChange={setTheme} onSessionUpdate={next => { setSession(next); setLocale(next.user.locale === 'en' ? 'en' : 'vi'); }} t={t} locale={locale} />}
        {screen === 'help' && <HelpScreen t={t} locale={locale} />}
      </>}
    </section></main>
  </div>;
}

function StateScreen({ title, detail, retry, retryLabel }: { title: string; detail: string; retry?: () => void; retryLabel?: string }) {
  return <main className="state-screen"><Leaf size={30} /><h1>{title}</h1><p>{detail}</p>{retry && <button className="primary-button" onClick={retry}><RefreshCw size={16} />{retryLabel}</button>}</main>;
}

function DashboardView({ dashboard, locale, t, onIncome, onPayment, onSetBudget, budgetRefreshKey }: { dashboard: Dashboard; locale: Locale; t: Copy; onIncome: () => void; onPayment: () => void; onSetBudget: () => void; budgetRefreshKey: number }) {
  const transactions = dashboard.recentTransactions;
  const { categories, hasError: categoryLoadFailed, isLoading: categoriesLoading, retry: retryCategories } = useCategories();
  return <>
    <div className="stats-grid">
      <section className="balance-card stat-card"><div className="stat-heading"><span>{t.balance}</span><WalletCards size={18} /></div><strong>{formatVnd(dashboard.wallet?.availableBalanceVnd, locale)}</strong><p className="muted">{dashboard.currentMonth?.month ?? t.noData}</p></section>
      <StatCard label={t.income} value={formatVnd(dashboard.currentMonth?.totalIncomeVnd, locale)} icon={<ArrowDownLeft size={17} />} tone="mint" />
      <StatCard label={t.spending} value={formatVnd(dashboard.currentMonth?.totalPaymentVnd, locale)} icon={<ArrowUpRight size={17} />} tone="coral" />
      <StatCard label={t.savings} value={formatVnd(dashboard.savings?.balanceVnd, locale)} icon={<Leaf size={17} />} tone="amber" />
    </div>
    <div className="action-row"><button className="secondary-button" onClick={onIncome}><ArrowDownLeft size={16} />{t.addIncome}</button><button className="primary-button" onClick={onPayment}><ArrowUpRight size={16} />{t.addPayment}</button></div>
    {(categoryLoadFailed || categoriesLoading) && <div className="form-message"><span role="status">{categoryLoadFailed ? t.categoryLoadFailed : t.loading}</span><button type="button" className="text-button" aria-label={`${t.retry}: ${t.categoryLoadFailed}`} disabled={categoriesLoading} onClick={retryCategories}>{t.retry}</button></div>}
    <div className="dashboard-grid"><section className="panel activity-panel"><div className="panel-heading"><div><h2>{t.recent}</h2><p className="muted">{t.recentDescription}</p></div></div><div className="transaction-list">{transactions.length ? transactions.map(transaction => <TransactionRow key={transaction.id} transaction={transaction} locale={locale} categoryName={formatCategoryName(transaction.categoryId, categories, locale)} typeLabel={transaction.type === 'income' ? t.income : t.spending} />) : <p className="empty-state">{t.noData}</p>}</div></section><BudgetPanel locale={locale} t={t} onSetBudget={onSetBudget} refreshKey={budgetRefreshKey} /></div>
  </>;
}

function StatCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return <section className="stat-card"><div className="stat-heading"><span>{label}</span><span className={`metric-icon ${tone}`}>{icon}</span></div><strong>{value}</strong></section>;
}

function TransactionRow({ transaction, locale, categoryName, typeLabel }: { transaction: Transaction; locale: Locale; categoryName: string; typeLabel: string }) {
  const isIncome = transaction.type === 'income';
  return <div className="transaction-row"><div className={`transaction-icon ${isIncome ? 'mint' : 'coral'}`}><span className="visually-hidden">{typeLabel}</span>{isIncome ? <ArrowDownLeft size={16} aria-hidden="true" /> : <ArrowUpRight size={16} aria-hidden="true" />}</div><div className="transaction-detail"><strong>{categoryName}</strong><span>{transaction.description?.trim() ? `${transaction.description.trim()} · ` : ''}{formatDate(transaction.occurredAt, locale)}</span></div><strong className={isIncome ? 'amount-positive' : ''}>{isIncome ? '+' : '-'}{formatVnd(transaction.amountVnd, locale)}</strong></div>;
}

function BudgetPanel({ locale, t, onSetBudget, refreshKey }: { locale: Locale; t: Copy; onSetBudget: () => void; refreshKey: number }) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setState('loading');
    const month = currentMonthKey();
    void Promise.all([
      apiRequest<BudgetSummary>(`/budgets/summary?month=${encodeURIComponent(month)}`),
      apiRequest<Budget[]>(`/budgets?month=${encodeURIComponent(month)}`),
    ]).then(([nextSummary, nextBudgets]) => {
      if (!active) return;
      setSummary(nextSummary);
      setBudgets(nextBudgets);
      setState('ready');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [refreshKey, retryKey]);
  if (state !== 'ready' || !summary) return <section className="panel budget-panel" aria-busy={state === 'loading'}><div className="panel-heading"><div><h2>{t.budget}</h2>{state === 'loading' ? <p className="muted" role="status">{t.loading}</p> : <p className="form-message"><span role="alert">{t.budgetUnavailable}</span></p>}</div><button type="button" className="text-button" aria-label={`${t.retry}: ${t.budget}`} disabled={state === 'loading'} onClick={() => setRetryKey(key => key + 1)}>{t.retry}</button></div></section>;
  const percent = summary.totalLimitVnd === 0 ? (summary.totalUsedVnd > 0 ? 100 : 0) : Math.min(100, summary.totalUsedVnd / summary.totalLimitVnd * 100);

  const isOverrun = summary.totalUsedVnd > summary.totalLimitVnd;
  return <section className="panel budget-panel"><div className="panel-heading"><div><h2>{t.budget}</h2><p className="muted">{t.thisMonth}</p></div><button type="button" className="text-button" onClick={onSetBudget}>{t.viewReport}</button></div><div className="budget-ring" style={{ background: `conic-gradient(${isOverrun ? '#c85d45' : '#36856e'} 0 ${percent}%, #eee8db ${percent}% 100%)` }}><div><strong>{Math.round(percent)}%</strong><span>{t.budget}</span></div></div><div className="budget-summary"><div><span>{locale === 'vi' ? 'Đã dùng' : 'Used'}</span><strong>{formatVnd(summary.totalUsedVnd, locale)}</strong></div><div><span>{locale === 'vi' ? 'Còn lại' : 'Remaining'}</span><strong className={isOverrun ? 'negative' : ''}>{formatVnd(Math.max(0, summary.totalLimitVnd - summary.totalUsedVnd), locale)}</strong></div></div><div className="budget-progress"><span style={{ width: `${percent}%`, background: isOverrun ? '#c85d45' : '#36856e' }} /></div>{summary.exceededCategoryCount > 0 && <p className="budget-note"><span className="status-dot" />{locale === 'vi' ? `${summary.exceededCategoryCount} danh mục vượt mức` : `${summary.exceededCategoryCount} categories exceeded`}</p>}</section>;
}

function WalletBaseline({ csrfToken, t, onComplete, onError }: { csrfToken: string; t: Copy; onComplete(): Promise<void>; onError(error: unknown): string }) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());
  const requestPayload = useRef<WalletBaselinePayload | null>(null);
  const [isRetryPending, setIsRetryPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isSaving || isComplete) return;
    const payload = requestPayload.current ?? serializeWalletBaseline(amount);
    if (!payload) { setMessage(t.validationError); return; }
    requestPayload.current = payload;
    setIsSaving(true);
    setMessage(t.initializePending);
    try {
      await apiRequest('/wallet/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, 'Idempotency-Key': idempotencyKey.current },
        body: JSON.stringify(payload)
      });
      await onComplete();
      setIsComplete(true);
      setIsRetryPending(false);
    } catch (caught) {
      const requestError = caught as RequestError;
      requestPayload.current = retryPayloadAfterTransactionFailure(payload, requestError.status);
      setIsRetryPending(requestPayload.current !== null);
      if (!requestPayload.current) idempotencyKey.current = crypto.randomUUID();
      setMessage(onError(caught));
      setIsSaving(false);
    }
  }

  return <section className="panel baseline-panel"><h2>{t.initializeWallet}</h2><p className="muted">{t.openingBalance}</p><form onSubmit={submit}><label htmlFor="opening-balance">{t.openingBalance}<input id="opening-balance" required inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} disabled={isComplete || isRetryPending} /></label><button className="primary-button" type="submit" disabled={isSaving || isComplete}>{isRetryPending ? t.retryTransaction : isSaving ? t.initializePending : t.initializeWallet}</button>{message && <p role="status" aria-live="polite" className="form-message">{message}</p>}</form></section>;
}

function TransactionForm({ kind, csrfToken, locale, t, onClose, onCommitted, onError }: {
  kind: 'income' | 'payment'; csrfToken: string; locale: Locale; t: Copy; onClose(): void;
  onCommitted(): Promise<string>; onError(error: unknown): string;
}) {
  const dialogRef = useRef<HTMLFormElement>(null);
  useDialogFocus(dialogRef, () => { if (!isSubmitting && !isRetryPending) onClose(); });
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryState, setCategoryState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryReloadKey, setCategoryReloadKey] = useState(0);
  const [description, setDescription] = useState('');
  const [suggestionState, setSuggestionState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null);
  const [suggestionConfirmed, setSuggestionConfirmed] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetryPending, setIsRetryPending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());
  const [occurredAt] = useState(() => new Date().toISOString());
  const amountRef = useRef<HTMLInputElement>(null);
  const requestPayload = useRef<TransactionPayload | null>(null);

  useEffect(() => {
    amountRef.current?.focus();
    let active = true;
    async function loadCategories() {
      if (!active) return;
      setCategoryState('loading');
      setCategoryError('');
      try {
        const result = await apiRequest<Category[]>(`/categories?appliesTo=${kind}`);
        if (!active) return;
        const enabled = result.filter(category => category.status === 'active' && isCategoryId(category.id));
        setCategories(enabled);
        setCategoryId(enabled[0]?.id ?? '');
        setCategoryState('ready');
      } catch {
        if (active) {
          setCategoryError(t.categoryLoadFailed);
          setCategoryState('error');
        }
      }
    }
    void loadCategories();
    return () => { active = false; };
  }, [kind, t.categoryLoadFailed, categoryReloadKey]);

  async function suggestCategory(): Promise<void> {
    if (suggestionState === 'loading' || !description.trim()) return;
    const requestedDescription = description;
    const requestedKind = kind;
    const requestedLocale = locale;
    setSuggestionState('loading');
    setSuggestedCategoryId(null);
    try {
      const result = await apiRequest<{ status: 'suggested' | 'manual' | 'disabled' | 'unavailable'; categoryId: string | null }>('/ai/category-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ transactionType: requestedKind, description: requestedDescription, locale: requestedLocale }),
      });
      if (requestedDescription !== description || requestedKind !== kind || requestedLocale !== locale) return;
      if (result.status === 'suggested' && result.categoryId && categories.some(category => category.id === result.categoryId)) {
        setSuggestedCategoryId(result.categoryId);
        setSuggestionState('ready');
        return;
      }
      setSuggestionState(result.status === 'disabled' || result.status === 'unavailable' ? 'error' : 'idle');
    } catch {
      if (requestedDescription === description && requestedKind === kind && requestedLocale === locale) setSuggestionState('error');
    }
  }

  function applySuggestion(category: string): void {
    if (suggestedCategoryId !== category) return;
    setCategoryId(category);
    setSuggestionConfirmed(true);
    setMessage(t.suggestionConfirm);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting || isComplete || categoryState !== 'ready' || categories.length === 0) return;
    const payload = requestPayload.current ?? serializeTransactionPayload({ type: kind, amount, categoryId, occurredAt, description });
    if (!payload) { setMessage(t.validationError); return; }
    if (suggestionConfirmed) payload.confirmedCategorySuggestion = true;
    requestPayload.current = payload;
    setIsSubmitting(true);
    setMessage(t.submitPending);
    try {
      await apiRequest('/ledger/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, 'Idempotency-Key': idempotencyKey.current },
        body: JSON.stringify(payload)
      });
    } catch (caught) {
      if ((caught as RequestError).status === 401) {
        setMessage(t.sessionExpired);
        setIsSubmitting(false);
        return;
      }
      requestPayload.current = retryPayloadAfterTransactionFailure(requestPayload.current ?? payload, (caught as RequestError).status);
      const hasAmbiguousOutcome = requestPayload.current !== null;
      setIsRetryPending(hasAmbiguousOutcome);
      if (!hasAmbiguousOutcome) idempotencyKey.current = crypto.randomUUID();
      setMessage(onError(caught));
      setIsSubmitting(false);
      return;
    }
    setIsRetryPending(false);
    setIsComplete(true);
    let notice: string;
    try {
      notice = await onCommitted();
    } catch {
      notice = onError(new Error(t.refreshFailed));
    }
    setMessage(notice);
    setIsSubmitting(false);
  }
  return <div className="modal-backdrop"><form ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-form-title" tabIndex={-1} onSubmit={submit}>
    <div className="panel-heading"><h2 id="transaction-form-title">{kind === 'income' ? t.addIncome : t.addPayment}</h2><button type="button" className="icon-button" onClick={onClose} disabled={isSubmitting || isRetryPending} aria-label={t.close}><X size={18} aria-hidden="true" /></button></div>
    <label htmlFor="transaction-amount">{t.amount}<input ref={amountRef} id="transaction-amount" required inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} disabled={isRetryPending || isComplete} /></label>
    <label htmlFor="transaction-category">{t.category}<select id="transaction-category" required value={categoryId} onChange={event => { setCategoryId(event.target.value); setSuggestionConfirmed(false); }} disabled={isRetryPending || isComplete || categoryState !== 'ready' || categories.length === 0}><option value="">{categoryState === 'loading' ? t.loading : t.selectCategory}</option>{categories.map(category => <option key={category.id} value={category.id}>{formatCategoryName(category.id, categories, locale)}</option>)}</select></label>
    <label htmlFor="transaction-description">{t.description}<input id="transaction-description" value={description} onChange={event => { setDescription(event.target.value); setSuggestionState('idle'); setSuggestedCategoryId(null); setSuggestionConfirmed(false); }} disabled={isRetryPending || isComplete} /></label>
    {categoryState === 'ready' && description.trim() && <button className="secondary-button" type="button" onClick={() => void suggestCategory()} disabled={suggestionState === 'loading' || isRetryPending || isComplete}>{suggestionState === 'loading' ? t.suggestingCategory : t.suggestCategory}</button>}
    {suggestionState === 'error' && <p role="status" className="form-message">{t.suggestionFailed}</p>}
    {suggestionState === 'ready' && suggestedCategoryId && <div role="group" aria-label={t.suggestionReady}><p role="status" className="form-message">{t.suggestionReady}</p><button className="secondary-button" type="button" onClick={() => applySuggestion(suggestedCategoryId)}>{t.suggestionUse}</button></div>}
    {isRetryPending && <p role="alert" className="form-message">{t.retryTransaction}</p>}
    {categoryState === 'ready' && categories.length === 0 && <p role="status" className="form-message">{t.noCategories}</p>}
    {(categoryState === 'error' || categoryState === 'loading') && <><p role={categoryState === 'error' ? 'alert' : 'status'} className="form-message">{categoryState === 'error' ? categoryError : t.loading}</p><button type="button" className="secondary-button" aria-label={`${t.retry}: ${t.category}`} disabled={categoryState === 'loading'} onClick={() => setCategoryReloadKey(key => key + 1)}>{t.retry}</button></>}
    {message && <p role="status" aria-live="polite" className="form-message">{message}</p>}
    <button className="primary-button" type={isComplete ? 'button' : 'submit'} onClick={isComplete ? onClose : undefined} disabled={isSubmitting || (!isComplete && !isRetryPending && (categoryState !== 'ready' || categories.length === 0))}>{isComplete ? t.close : isRetryPending ? t.retry : isSubmitting ? t.submitPending : t.submit}</button>
  </form></div>;
}
