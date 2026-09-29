import { useEffect, useState, useRef } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CircleHelp,
  Coins,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Settings,
  Sparkles,
  Sun,
  WalletCards,
  X,
} from 'lucide-react';
import { apiGet, apiPatch, apiPost, setUnauthorizedHandler, ApiRequestError } from './api-client.js';
import { formatVnd, formatDate, getCurrentMonth, getCurrentDateFormatted, getVietnamGreetingPeriod } from './format.js';
import { copy, type Copy } from './i18n.js';
import type { Locale, Theme, Screen, Session, Dashboard, BudgetSummary, Transaction, User } from './types.js';
import { TransactionForm } from './components/TransactionForm.js';
import { InitWalletModal } from './components/InitWalletModal.js';
import { TransactionsScreen } from './screens/TransactionsScreen.js';
import { SavingsScreen } from './screens/SavingsScreen.js';
import { ReportsScreen } from './screens/ReportsScreen.js';
import { AdminScreen } from './screens/AdminScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';
import { HelpScreen } from './screens/HelpScreen.js';
import { useCategories } from './hooks/use-categories.js';
import { AuthScreen } from './components/AuthScreen.js';

interface ProfileNotification {
  id: string;
  createdAt: string;
  isRead: boolean;
  kind: 'profile-updated';
}

export function App() {
  const [locale, setLocale] = useState<Locale>('vi');
  const [clockNow, setClockNow] = useState(() => new Date());
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || saved === 'light' ? saved : 'light';
    } catch {
      return 'light';
    }
  });

  function handleThemeChange(nextTheme: Theme) {
    setTheme(nextTheme);
    try {
      localStorage.setItem('theme', nextTheme);
    } catch { }
  }

  function cycleTheme() {
    handleThemeChange(theme === 'light' ? 'dark' : 'light');
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const sidebarRef = useRef<HTMLElement>(null);
  const notificationPanelRef = useRef<HTMLDivElement>(null);

  function toggleSidebar() {
    if (window.innerWidth <= 800) {
      setMenuOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  }

  // Close mobile sidebar when clicking outside or pressing Escape
  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      const isMenuTrigger = (target as HTMLElement).closest?.('.menu-trigger');
      if (sidebarRef.current && !sidebarRef.current.contains(target) && !isMenuTrigger) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const [session, setSession] = useState<Session | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'error'>('loading');
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState<'income' | 'payment' | null>(null);
  const [initWalletOpen, setInitWalletOpen] = useState(false);
  const [notifications, setNotifications] = useState<ProfileNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isLocaleSaving, setIsLocaleSaving] = useState(false);
  const [localeError, setLocaleError] = useState('');
  const [signOutError, setSignOutError] = useState(false);
  const dashboardRequestId = useRef(0);
  const t = copy[locale];
  const isProfileIncomplete = Boolean(session && (!session.user.birthDate || !session.user.gender));
  const unreadNotificationCount = notifications.filter(notification => !notification.isRead).length + Number(isProfileIncomplete);
  const notificationItems = [
    ...(isProfileIncomplete ? [{ id: 'profile-completion-required', kind: 'profile-completion' as const }] : []),
    ...notifications,
  ];
  const greetingPeriod = getVietnamGreetingPeriod(clockNow);
  const greeting = greetingPeriod === 'morning'
    ? t.greetingMorning
    : greetingPeriod === 'noon'
      ? t.greetingNoon
      : greetingPeriod === 'afternoon'
        ? t.greetingAfternoon
        : t.greetingEvening;

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function toggleNotifications() {
    const shouldOpen = !notificationsOpen;
    setNotificationsOpen(shouldOpen);
    if (shouldOpen) {
      setNotifications(previous => previous.map(notification => ({ ...notification, isRead: true })));
    }
  }

  function recordProfileUpdated() {
    setNotifications(previous => [{
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      isRead: false,
      kind: 'profile-updated' as const,
    }, ...previous].slice(0, 10));
  }

  async function toggleLocale() {
    if (!session || isLocaleSaving) return;
    const nextLocale: Locale = locale === 'vi' ? 'en' : 'vi';
    setLocaleError('');
    setIsLocaleSaving(true);
    try {
      const updatedUser = await apiPatch<User>(
        '/users/me/preferences',
        { locale: nextLocale },
        { 'X-CSRF-Token': session.csrfToken },
      );
      setSession(current => current ? { ...current, user: updatedUser } : current);
      setLocale(updatedUser.locale);
      recordProfileUpdated();
    } catch {
      setLocaleError(copy[locale].serverError);
    } finally {
      setIsLocaleSaving(false);
    }
  }

  useEffect(() => {
    if (!notificationsOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setNotificationsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationsOpen]);

  // Configure global unauthorized handler for the API client
  useEffect(() => {
    setUnauthorizedHandler(() => {
      dashboardRequestId.current += 1;
      setDashboard(null);
      setSession(null);
      setState('unauthenticated');
    });
  }, []);

  async function loadDashboard(silent = false) {
    if (!session) return;
    const requestId = ++dashboardRequestId.current;
    if (!silent) setState('loading');
    setError('');
    try {
      const data = await apiGet<Dashboard>('/reports/dashboard');
      if (requestId !== dashboardRequestId.current) return;
      setDashboard(data);
      setState('ready');
    } catch (caught) {
      if (requestId !== dashboardRequestId.current) return;
      if (caught instanceof ApiRequestError && caught.isUnauthorized) {
        setDashboard(null);
        setSession(null);
        setState('unauthenticated');
        return;
      }
      if (!silent) setState('error');
      setError(t.unavailable);
    }
  }

  useEffect(() => {
    apiGet<Session>('/auth/session')
      .then((current) => {
        setSession(current);
        setLocale(current.user.locale);
      })
      .catch((caught) => {
        if (caught?.status === 401) {
          setState('unauthenticated');
        } else {
          setState('error');
          setError(caught instanceof Error ? caught.message : 'REQUEST_FAILED');
        }
      });
  }, []);

  useEffect(() => {
    if (session?.user.role === 'admin' && !['admin', 'settings'].includes(screen)) {
      setScreen('admin');
    }
  }, [session, screen]);

  useEffect(() => {
    if (session && session.user.role !== 'admin') void loadDashboard(screen !== 'dashboard');
  }, [session, screen]);

  async function signOut() {
    if (!session) return;
    setSignOutError(false);
    try {
      await apiPost('/auth/logout', {}, { 'X-CSRF-Token': session.csrfToken });
    } catch {
      setSignOutError(true);
      return;
    }
    dashboardRequestId.current += 1;
    setSession(null);
    setDashboard(null);
    setNotifications([]);
    setNotificationsOpen(false);
    setState('unauthenticated');
  }

  function openTransactionForm(type: 'income' | 'payment') {
    if (!dashboard?.wallet) {
      setInitWalletOpen(true);
      return;
    }
    setFormOpen(type);
  }

  if (state === 'loading' && !session) return <StateScreen title={t.loading} detail={t.loading} />;
  if (state === 'unauthenticated') {
    return (
      <AuthScreen
        locale={locale}
        onLocaleChange={setLocale}
        onAuthenticated={(newSession) => {
          dashboardRequestId.current += 1;
          setDashboard(null);
          setSession(newSession);
          setNotifications([]);
          setNotificationsOpen(false);
          setState('loading');
          setSignOutError(false);
        }}
      />
    );
  }
  if (!session) return <StateScreen title={t.unavailable} detail={error} retry={() => window.location.reload()} retryLabel={t.retry} />;

  return (
    <div
      className={`app-shell ${theme === 'dark' ? 'theme-dark' : ''}`}
      lang={locale}
    >
      {menuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-label={locale === 'vi' ? 'Đóng menu' : 'Close menu'}
          role="button"
          tabIndex={0}
        />
      )}
      <aside ref={sidebarRef} className={`sidebar ${menuOpen ? 'is-open' : ''} ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Coins size={20} strokeWidth={2.4} /></div>
          <span className="brand-text">campus<span>coin</span></span>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setMenuOpen(false)}
            aria-label={locale === 'vi' ? 'Đóng menu' : 'Close menu'}
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Primary navigation">
          {session.user.role !== 'admin' && (
            <>
          <p className="nav-label">{t.workspace}</p>
          <NavItem icon={<LayoutDashboard size={18} />} label={t.dashboard} active={screen === 'dashboard'} onClick={() => { setScreen('dashboard'); setMenuOpen(false); }} />
          <NavItem icon={<CreditCard size={18} />} label={t.transactions} active={screen === 'transactions'} onClick={() => { setScreen('transactions'); setMenuOpen(false); }} />
          <NavItem icon={<WalletCards size={18} />} label={t.goals} active={screen === 'savings'} onClick={() => { setScreen('savings'); setMenuOpen(false); }} />
          <NavItem icon={<FileText size={18} />} label={t.reports} active={screen === 'reports'} onClick={() => { setScreen('reports'); setMenuOpen(false); }} />
            </>
          )}
          <p className="nav-label nav-label-spaced">{t.more}</p>
          {session.user.role === 'admin' && <NavItem icon={<CircleHelp size={18} />} label={t.admin} active={screen === 'admin'} onClick={() => { setScreen('admin'); setMenuOpen(false); }} />}
          <NavItem icon={<Settings size={18} />} label={t.settings} active={screen === 'settings'} onClick={() => { setScreen('settings'); setMenuOpen(false); }} />
          {session.user.role !== 'admin' && <NavItem icon={<CircleHelp size={18} />} label={t.help} active={screen === 'help'} onClick={() => { setScreen('help'); setMenuOpen(false); }} />}
        </nav>

        <div className="sidebar-bottom">
          <div className="mini-profile">
            <div className="avatar">{(session.user.displayName || 'U').substring(0, 2).toUpperCase()}</div>
            <div><strong>{session.user.displayName}</strong><small>{t.personalAccount}</small></div>
          </div>
          <button className="signout-button" onClick={() => void signOut()}>
            <LogOut size={15} />
            <span>{t.signOut}</span>
          </button>
        </div>
      </aside>

      <main className={`main-content ${sidebarCollapsed ? 'is-expanded' : ''}`}>
        <header className="topbar">
          <button className="icon-button menu-trigger" aria-label={t.menu} onClick={toggleSidebar}><Menu size={21} /></button>
          <div className="breadcrumbs">
            <span className="breadcrumbs-user" title={session.user.displayName || t.personal}>{session.user.displayName || t.personal}</span>
            <span>/</span>
            <strong>{screen === 'dashboard' ? t.dashboard : screen === 'transactions' ? t.transactions : screen === 'savings' ? t.savings : screen === 'reports' ? t.reports : screen === 'admin' ? t.admin : screen === 'help' ? t.help : t.settingsTitle}</strong>
          </div>
          <div className="topbar-actions">
            <div className="topbar-user-badge" title={`${session.user.displayName} (${session.user.email})`}>
              <div className="avatar micro">{(session.user.displayName || 'U').substring(0, 2).toUpperCase()}</div>
              <span className="topbar-user-name">{session.user.displayName}</span>
            </div>
            <div className="notification-menu" ref={notificationPanelRef}>
              <button
                className="icon-button notification-trigger"
                onClick={toggleNotifications}
                aria-label={`${t.notifications}${unreadNotificationCount ? ` (${unreadNotificationCount})` : ''}`}
                aria-expanded={notificationsOpen}
                aria-controls="notification-panel"
                title={t.notifications}
              >
                <Bell size={19} />
                {unreadNotificationCount > 0 && <span className="notification-badge" aria-hidden="true">{unreadNotificationCount}</span>}
              </button>
              <div
                id="notification-panel"
                className="notification-panel"
                role="region"
                aria-label={t.notifications}
                hidden={!notificationsOpen}
              >
                <h2>{t.notifications}</h2>
                {notificationItems.length === 0 ? (
                  <p className="notification-empty">{t.noNotifications}</p>
                ) : (
                  <ul>
                    {notificationItems.map(notification => (
                      <li
                        key={notification.id}
                        className={notification.kind === 'profile-completion' || !notification.isRead ? 'is-unread' : ''}
                      >
                        <span>{notification.kind === 'profile-completion' ? t.profileCompletionReminder : t.profileUpdatedNotification}</span>
                        {notification.kind === 'profile-completion' ? (
                          <button
                            type="button"
                            className="notification-action"
                            onClick={() => { setNotificationsOpen(false); setScreen('settings'); }}
                          >
                            {t.openProfileSettings}
                          </button>
                        ) : (
                          <time dateTime={notification.createdAt}>{formatDate(notification.createdAt, locale)}</time>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <button className="locale-toggle" onClick={() => void toggleLocale()} disabled={isLocaleSaving} aria-label={t.language}>{locale.toUpperCase()}</button>
            <button
              className="icon-button"
              onClick={cycleTheme}
              aria-label={t.appearance}
              title={
                theme === 'light'
                  ? (locale === 'vi' ? 'Chế độ Sáng (bấm để chuyển Galaxy)' : 'Light mode (click for Galaxy)')
                  : (locale === 'vi' ? 'Chế độ Galaxy (bấm để chuyển Sáng)' : 'Galaxy mode (click for Light)')
              }
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        <section className="content-wrap">
          {signOutError && <p role="alert" className="error-banner">{t.signOutFailed}</p>}
          {localeError && <p role="alert" className="error-banner">{localeError}</p>}
          {screen === 'dashboard' && (
            <>
              <div className="page-intro">
                <div>
                  <p className="eyebrow">{getCurrentDateFormatted(locale)}</p>
                  <h1>{greeting}</h1>
                  <p className="muted">{t.overview}</p>
                </div>
              </div>

              {state === 'error' && <StateScreen title={t.unavailable} detail={error} retry={() => void loadDashboard()} retryLabel={t.retry} />}
              {state === 'loading' && <div className="status-panel" role="status">{t.loading}</div>}
              {state === 'ready' && (
                <DashboardView
                  dashboard={dashboard}
                  locale={locale}
                  t={t}
                  onIncome={() => openTransactionForm('income')}
                  onPayment={() => openTransactionForm('payment')}
                  onInitWallet={() => setInitWalletOpen(true)}
                  onSetBudget={() => setScreen('reports')}
                />
              )}
            </>
          )}

          {screen === 'transactions' && <TransactionsScreen t={t} locale={locale} />}
          {screen === 'savings' && (
            <SavingsScreen
              csrfToken={session.csrfToken}
              t={t}
              locale={locale}
              onTransferSuccess={() => void loadDashboard(true)}
            />
          )}
          {screen === 'reports' && <ReportsScreen csrfToken={session.csrfToken} t={t} locale={locale} />}
          {screen === 'admin' && <AdminScreen session={session} csrfToken={session.csrfToken} t={t} locale={locale} />}
          {screen === 'help' && <HelpScreen t={t} locale={locale} csrfToken={session.csrfToken} role={session.user.role} />}
          {screen === 'settings' && (
            <SettingsScreen
              session={session}
              theme={theme}
              onThemeChange={handleThemeChange}
              onSessionUpdate={(newSession) => { setSession(newSession); setLocale(newSession.user.locale); }}
              onProfileUpdated={recordProfileUpdated}
              t={t}
              locale={locale}
            />
          )}

          {formOpen && (
            <TransactionForm
              kind={formOpen}
              csrfToken={session.csrfToken}
              t={t}
              locale={locale}
              onClose={() => setFormOpen(null)}
              onSuccess={() => void loadDashboard()}
              onInitWalletRequired={() => {
                setFormOpen(null);
                setInitWalletOpen(true);
              }}
            />
          )}

          {initWalletOpen && (
            <InitWalletModal
              csrfToken={session.csrfToken}
              locale={locale}
              onClose={() => setInitWalletOpen(false)}
              onSuccess={() => void loadDashboard()}
            />
          )}
        </section>
      </main>

    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} title={label}>{icon}<span>{label}</span>{active && <span className="active-pip" />}</button>;
}

function StateScreen({ title, detail, retry, retryLabel }: { title: string; detail: string; retry?: () => void; retryLabel?: string }) {
  return <main className="state-screen"><Coins size={30} /><h1>{title}</h1><p>{detail}</p>{retry && <button className="primary-button" onClick={retry}><RefreshCw size={16} />{retryLabel}</button>}</main>;
}


function DashboardView({
  dashboard,
  locale,
  t,
  onIncome,
  onPayment,
  onInitWallet,
  onSetBudget,
}: {
  dashboard: Dashboard | null;
  locale: Locale;
  t: Copy;
  onIncome: () => void;
  onPayment: () => void;
  onInitWallet: () => void;
  onSetBudget?: (() => void) | undefined;
}) {
  const transactions = dashboard?.recentTransactions ?? [];
  const isWalletInit = Boolean(dashboard?.wallet);
  const { getCategoryName } = useCategories();

  return <>
    {!isWalletInit && (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(253, 230, 138, 0.1) 100%)',
        border: '1.5px solid rgba(245, 158, 11, 0.4)',
        marginBottom: 20,
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sparkles size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {locale === 'vi'
              ? 'Chào bạn! Ví của bạn chưa có số dư ban đầu. Vui lòng khởi tạo ví để bắt đầu ghi chép chi tiêu.'
              : 'Welcome! Your wallet has no initial balance. Please initialize your wallet to start tracking.'}
          </span>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={onInitWallet}
          style={{ padding: '8px 16px', fontSize: 12 }}
        >
          <Sparkles size={15} />
          {locale === 'vi' ? 'Thiết lập số dư ví' : 'Set Balance'}
        </button>
      </div>
    )}

    <div className="stats-grid">
      <section className="balance-card stat-card">
        <div className="stat-heading"><span>{t.balance}</span><WalletCards size={18} /></div>
        {isWalletInit ? (
          <>
            <strong>{formatVnd(dashboard?.wallet?.availableBalanceVnd, locale)}</strong>
          </>
        ) : (
          <div style={{ marginTop: 4 }}>
            <strong style={{ fontSize: 20, display: 'block', marginBottom: 8 }}>
              {locale === 'vi' ? 'Chưa khởi tạo' : 'Not set'}
            </strong>
            <button
              type="button"
              className="primary-button"
              onClick={onInitWallet}
              style={{
                fontSize: 11,
                padding: '6px 12px',
                width: 'fit-content',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
              }}
            >
              <Sparkles size={13} />
              {locale === 'vi' ? 'Khởi tạo ví' : 'Initialize'}
            </button>
          </div>
        )}
      </section>
      <StatCard label={t.income} value={formatVnd(dashboard?.currentMonth?.totalIncomeVnd, locale)} icon={<ArrowDownLeft size={17} />} tone="mint" />
      <StatCard label={t.spending} value={formatVnd(dashboard?.currentMonth?.totalPaymentVnd, locale)} icon={<ArrowUpRight size={17} />} tone="coral" />
      <StatCard label={t.savings} value={formatVnd(dashboard?.savings?.balanceVnd, locale)} icon={<Coins size={17} />} tone="amber" />
    </div>
    <div className="dashboard-action-row" role="group" aria-label={locale === 'vi' ? 'Thêm giao dịch' : 'Add a transaction'}>
      <button className="secondary-button action-btn-income" type="button" onClick={onIncome}>
        <ArrowDownLeft size={16} />{t.addIncome}
      </button>
      <button className="primary-button action-btn-payment" type="button" onClick={onPayment}>
        <ArrowUpRight size={16} />{t.addPayment}
      </button>
    </div>
    <div className="dashboard-grid">
      <section className="panel activity-panel">
        <div className="panel-heading">
          <div><h2>{t.recent}</h2></div>
        </div>
        <div className="transaction-list">
          {transactions.length ? transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              locale={locale}
              categoryName={getCategoryName(transaction.categoryId, locale)}
            />
          )) : <p className="empty-state">{t.noData}</p>}
        </div>
      </section>
      <BudgetPanel locale={locale} t={t} onSetBudget={onSetBudget} />
    </div>
  </>;
}

function StatCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return <section className="stat-card"><div className="stat-heading"><span>{label}</span><span className={`metric-icon ${tone}`}>{icon}</span></div><strong>{value}</strong></section>;
}

function TransactionRow({
  transaction,
  locale,
  categoryName,
}: {
  transaction: NonNullable<Dashboard['recentTransactions']>[number];
  locale: Locale;
  categoryName?: string;
}) {
  const isIncome = transaction.type === 'income';
  return (
    <div className="transaction-row">
      <div className={`transaction-icon ${isIncome ? 'mint' : 'coral'}`}>{isIncome ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</div>
      <div className="transaction-detail">
        <strong>{categoryName || transaction.categoryId}</strong>
        <span>
          {transaction.description ? `${transaction.description} • ` : ''}
          {formatDate(transaction.occurredAt, locale)}
        </span>
      </div>
      <strong className={isIncome ? 'amount-positive' : ''}>{isIncome ? '+' : '-'}{formatVnd(transaction.amountVnd, locale)}</strong>
    </div>
  );
}

function BudgetPanel({ locale, t, onSetBudget }: { locale: Locale; t: Copy; onSetBudget?: (() => void) | undefined }) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadState('loading');
    const load = async () => {
      try {
        const month = getCurrentMonth();
        const data = await apiGet<BudgetSummary>(`/budgets/summary?month=${month}`);
        if (active) {
          setSummary(data);
          setLoadState('ready');
        }
      } catch {
        if (active) setLoadState('error');
      }
    };
    void load();
    return () => { active = false; };
  }, [refreshKey]);

  if (loadState === 'loading') {
    return (
      <section className="panel budget-panel">
        <div className="panel-heading">
          <div><h2>{t.budget}</h2><p className="muted">{t.loading}</p></div>
        </div>
      </section>
    );
  }

  if (loadState === 'error') {
    return (
      <section className="panel budget-panel" aria-live="polite">
        <div className="panel-heading">
          <div><h2>{t.budget}</h2><p role="alert" className="muted">{t.budgetLoadFailed}</p></div>
        </div>
        <button type="button" className="secondary-button" onClick={() => setRefreshKey((value) => value + 1)}>{t.retry}</button>
      </section>
    );
  }

  if (!summary || summary.totalLimitVnd === 0) {
    return (
      <section className="panel budget-panel">
        <div className="panel-heading">
          <div>
            <h2>{t.budget}</h2>
            <p className="muted">{locale === 'vi' ? 'Chưa đặt hạn mức' : 'No budget set'}</p>
          </div>
        </div>
        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 16px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
            {locale === 'vi'
              ? 'Bạn chưa đặt hạn mức chi tiêu cho tháng này. Hãy thiết lập ngân sách để theo dõi và kiểm soát chi tiêu tốt hơn.'
              : 'You have not set any spending limits for this month. Set a budget to track your expenses.'}
          </p>
          {onSetBudget && (
            <button
              type="button"
              className="secondary-button"
              onClick={onSetBudget}
              style={{ fontSize: 12, padding: '6px 14px', marginTop: 4 }}
            >
              <Sparkles size={14} />
              <span>{locale === 'vi' ? 'Thiết lập ngân sách' : 'Set up budget'}</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  const pct = Math.min(100, (summary.totalUsedVnd / summary.totalLimitVnd) * 100);
  const isOverrun = summary.totalUsedVnd > summary.totalLimitVnd;
  const strokeColor = isOverrun ? '#f59e0b' : '#36856e';

  return (
    <section className="panel budget-panel">
      <div className="panel-heading">
        <div>
          <h2>{t.budget}</h2>
          <p className="muted">{t.thisMonth}</p>
        </div>
      </div>

      <div
        className="budget-ring"
        style={{
          background: `conic-gradient(${strokeColor} 0% ${pct}%, var(--budget-track, #e2e8f0) ${pct}% 100%)`,
        }}
      >
        <div>
          <strong>{Math.round(pct)}%</strong>
          <span>{locale === 'vi' ? 'ngân sách' : 'budget'}</span>
        </div>
      </div>

      <div className="budget-summary">
        <div>
          <span style={{ display: 'block', fontSize: 10, color: '#9a9b92', marginBottom: 2 }}>
            {locale === 'vi' ? 'Đã dùng' : 'Used'}
          </span>
          <strong>{formatVnd(summary.totalUsedVnd, locale)}</strong>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ display: 'block', fontSize: 10, color: '#9a9b92', marginBottom: 2 }}>
            {locale === 'vi' ? 'Còn lại' : 'Remaining'}
          </span>
          <strong style={{ color: isOverrun ? '#f59e0b' : undefined }}>
            {formatVnd(Math.max(0, summary.totalLimitVnd - summary.totalUsedVnd), locale)}
          </strong>
        </div>
      </div>

      <div className="budget-progress">
        <span
          style={{
            width: `${pct}%`,
            background: isOverrun
              ? 'linear-gradient(90deg, #fde68a, #f59e0b)'
              : 'linear-gradient(90deg, #a7f3d0, #36856e)',
          }}
        />
      </div>

      {summary.exceededCategoryCount > 0 && (
        <p className="budget-note warning">
          <span className="status-dot coral" />
          {locale === 'vi'
            ? `${summary.exceededCategoryCount} danh mục vượt mức`
            : `${summary.exceededCategoryCount} categories exceeded`}
        </p>
      )}
    </section>
  );
}
