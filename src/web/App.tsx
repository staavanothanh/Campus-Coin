import { useEffect, useState, useRef } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BellOff,
  CircleHelp,
  Coins,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Sun,
  WalletCards,
  X
} from 'lucide-react';
import { apiGet, apiPost, setUnauthorizedHandler } from './api-client.js';
import { formatVnd, formatDate, getCurrentMonthFormatted, getCurrentDateFormatted } from './format.js';
import { copy, type Copy } from './i18n.js';
import type { Locale, Theme, Screen, Session, Dashboard, BudgetSummary, Transaction } from './types.js';
import { TransactionForm } from './components/TransactionForm.js';
import { InitWalletModal } from './components/InitWalletModal.js';
import { TransactionsScreen } from './screens/TransactionsScreen.js';
import { SavingsScreen } from './screens/SavingsScreen.js';
import { ReportsScreen } from './screens/ReportsScreen.js';
import { AdminScreen } from './screens/AdminScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';
import { HelpScreen } from './screens/HelpScreen.js';

export function App() {
  const [locale, setLocale] = useState<Locale>('vi');
  const [theme, setTheme] = useState<Theme>('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const sidebarRef = useRef<HTMLElement>(null);

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
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('notifications_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const t = copy[locale];

  function toggleNotifications() {
    setNotificationsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('notifications_enabled', String(next));
      } catch { }
      const msg = next
        ? (locale === 'vi' ? 'Đã bật thông báo' : 'Notifications enabled')
        : (locale === 'vi' ? 'Đã tắt thông báo' : 'Notifications muted');
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 2500);
      return next;
    });
  }

  // Configure global unauthorized handler for the API client
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      setState('unauthenticated');
    });
  }, []);

  async function loadDashboard() {
    if (!session) return;
    setState('loading');
    setError('');
    try {
      const data = await apiGet<Dashboard>('/reports/dashboard');
      setDashboard(data);
      setState('ready');
    } catch (caught) {
      setState('error');
      setError(caught instanceof Error ? caught.message : 'REQUEST_FAILED');
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
    if (session) void loadDashboard();
  }, [session]);

  async function signOut() {
    if (!session) return;
    try {
      await apiPost('/auth/logout', {}, { 'X-CSRF-Token': session.csrfToken });
    } catch {
      // ignore
    }
    setSession(null);
    setDashboard(null);
    setState('unauthenticated');
  }

  if (state === 'loading' && !session) return <StateScreen title={t.loading} detail={t.loading} />;
  if (state === 'unauthenticated') return <SignInScreen t={t} />;
  if (!session) return <StateScreen title={t.unavailable} detail={error} retry={() => window.location.reload()} retryLabel={t.retry} />;

  return (
    <div className={`app-shell ${theme === 'dark' ? 'theme-dark' : ''}`} lang={locale}>
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
          <p className="nav-label">{t.workspace}</p>
          <NavItem icon={<LayoutDashboard size={18} />} label={t.dashboard} active={screen === 'dashboard'} onClick={() => { setScreen('dashboard'); setMenuOpen(false); }} />
          <NavItem icon={<CreditCard size={18} />} label={t.transactions} active={screen === 'transactions'} onClick={() => { setScreen('transactions'); setMenuOpen(false); }} />
          <NavItem icon={<WalletCards size={18} />} label={t.goals} active={screen === 'savings'} onClick={() => { setScreen('savings'); setMenuOpen(false); }} />
          <NavItem icon={<FileText size={18} />} label={t.reports} active={screen === 'reports'} onClick={() => { setScreen('reports'); setMenuOpen(false); }} />
          <p className="nav-label nav-label-spaced">{t.more}</p>
          {session.user.role !== 'user' && <NavItem icon={<CircleHelp size={18} />} label={t.admin} active={screen === 'admin'} onClick={() => { setScreen('admin'); setMenuOpen(false); }} />}
          <NavItem icon={<Settings size={18} />} label={t.settings} active={screen === 'settings'} onClick={() => { setScreen('settings'); setMenuOpen(false); }} />
          <NavItem icon={<CircleHelp size={18} />} label={t.help} active={screen === 'help'} onClick={() => { setScreen('help'); setMenuOpen(false); }} />
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
          <div className="breadcrumbs"><span>{t.personal}</span><span>/</span><strong>{screen === 'dashboard' ? t.dashboard : screen === 'transactions' ? t.transactions : screen === 'savings' ? t.savings : screen === 'reports' ? t.reports : screen === 'admin' ? t.admin : screen === 'help' ? t.help : t.settingsTitle}</strong></div>
          <div className="topbar-actions">
            <button
              className="icon-button"
              onClick={toggleNotifications}
              aria-label={notificationsEnabled ? (locale === 'vi' ? 'Tắt thông báo' : 'Mute notifications') : (locale === 'vi' ? 'Bật thông báo' : 'Enable notifications')}
              title={notificationsEnabled ? (locale === 'vi' ? 'Thông báo: Đang bật (nhấp để tắt)' : 'Notifications: ON (click to mute)') : (locale === 'vi' ? 'Thông báo: Đang tắt (nhấp để bật)' : 'Notifications: OFF (click to enable)')}
            >
              {notificationsEnabled ? <Bell size={19} /> : <BellOff size={19} />}
            </button>
            <button className="locale-toggle" onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')} aria-label={t.language}>{locale.toUpperCase()}</button>
            <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={t.appearance}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
          </div>
        </header>

        <section className="content-wrap">
          {screen === 'dashboard' && (
            <>
              <div className="page-intro">
                <div>
                  <p className="eyebrow">{getCurrentDateFormatted(locale)}</p>
                  <h1>{t.greeting.replace('{name}', session.user.displayName)}</h1>
                  <p className="muted">{t.overview}</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => {
                    if (!dashboard?.wallet) {
                      setInitWalletOpen(true);
                    } else {
                      setFormOpen('payment');
                    }
                  }}
                >
                  <Plus size={18} />
                  {t.addTransaction}
                </button>
              </div>

              {state === 'error' && <StateScreen title={t.unavailable} detail={error} retry={() => void loadDashboard()} retryLabel={t.retry} />}
              {state === 'loading' && <div className="status-panel" role="status">{t.loading}</div>}
              {state === 'ready' && (
                <DashboardView
                  dashboard={dashboard}
                  locale={locale}
                  t={t}
                  onIncome={() => {
                    if (!dashboard?.wallet) {
                      setInitWalletOpen(true);
                    } else {
                      setFormOpen('income');
                    }
                  }}
                  onPayment={() => {
                    if (!dashboard?.wallet) {
                      setInitWalletOpen(true);
                    } else {
                      setFormOpen('payment');
                    }
                  }}
                  onInitWallet={() => setInitWalletOpen(true)}
                />
              )}
            </>
          )}

          {screen === 'transactions' && <TransactionsScreen t={t} locale={locale} />}
          {screen === 'savings' && <SavingsScreen csrfToken={session.csrfToken} t={t} locale={locale} />}
          {screen === 'reports' && <ReportsScreen csrfToken={session.csrfToken} t={t} locale={locale} />}
          {screen === 'admin' && <AdminScreen session={session} csrfToken={session.csrfToken} t={t} locale={locale} />}
          {screen === 'help' && <HelpScreen t={t} locale={locale} />}
          {screen === 'settings' && (
            <SettingsScreen
              session={session}
              theme={theme}
              onThemeChange={setTheme}
              onSessionUpdate={(newSession) => { setSession(newSession); setLocale(newSession.user.locale); }}
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

      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          padding: '10px 16px',
          borderRadius: 10,
          background: theme === 'dark' ? '#1e293b' : '#0f172a',
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
        }}>
          {notificationsEnabled ? <Bell size={16} color="#f59e0b" /> : <BellOff size={16} color="#94a3b8" />}
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} title={label}>{icon}<span>{label}</span>{active && <span className="active-pip" />}</button>;
}

function StateScreen({ title, detail, retry, retryLabel }: { title: string; detail: string; retry?: () => void; retryLabel?: string }) {
  return <main className="state-screen"><Coins size={30} /><h1>{title}</h1><p>{detail}</p>{retry && <button className="primary-button" onClick={retry}><RefreshCw size={16} />{retryLabel}</button>}</main>;
}

function SignInScreen({ t }: { t: Copy }) {
  return <main className="state-screen sign-in-screen"><div className="brand-mark"><Coins size={20} strokeWidth={2.4} /></div><h1>campus<span>coin</span></h1><p>{t.signInDescription}</p><a className="primary-button" href="/api/v1/auth/google/start"><span className="google-dot">G</span>{t.signIn}</a></main>;
}

function DashboardView({
  dashboard,
  locale,
  t,
  onIncome,
  onPayment,
  onInitWallet,
}: {
  dashboard: Dashboard | null;
  locale: Locale;
  t: Copy;
  onIncome: () => void;
  onPayment: () => void;
  onInitWallet: () => void;
}) {
  const transactions = dashboard?.recentTransactions ?? [];
  const isWalletInit = Boolean(dashboard?.wallet);

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
            <p className="muted">{t.thisMonth}</p>
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
    <div className="action-row">
      <button className="secondary-button" onClick={onIncome}><ArrowDownLeft size={16} />{t.addIncome}</button>
      <button className="primary-button" onClick={onPayment}><ArrowUpRight size={16} />{t.addPayment}</button>
    </div>
    <div className="dashboard-grid">
      <section className="panel activity-panel">
        <div className="panel-heading">
          <div><h2>{t.recent}</h2><p className="muted">{t.noData}</p></div>
        </div>
        <div className="transaction-list">
          {transactions.length ? transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} locale={locale} />) : <p className="empty-state">{t.noData}</p>}
        </div>
      </section>
      <BudgetPanel locale={locale} t={t} />
    </div>
  </>;
}

function StatCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return <section className="stat-card"><div className="stat-heading"><span>{label}</span><span className={`metric-icon ${tone}`}>{icon}</span></div><strong>{value}</strong></section>;
}

function TransactionRow({ transaction, locale }: { transaction: NonNullable<Dashboard['recentTransactions']>[number]; locale: Locale }) {
  const isIncome = transaction.type === 'income';
  return (
    <div className="transaction-row">
      <div className={`transaction-icon ${isIncome ? 'mint' : 'coral'}`}>{isIncome ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</div>
      <div className="transaction-detail">
        <strong>{transaction.categoryId}</strong>
        <span>{formatDate(transaction.occurredAt, locale)}</span>
      </div>
      <strong className={isIncome ? 'amount-positive' : ''}>{isIncome ? '+' : '-'}{formatVnd(transaction.amountVnd, locale)}</strong>
    </div>
  );
}

function BudgetPanel({ locale, t }: { locale: Locale; t: Copy }) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const month = new Date().toISOString().slice(0, 7);
        const data = await apiGet<BudgetSummary>(`/budgets/summary?month=${month}`);
        if (active) setSummary(data);
      } catch {
        // ignore for now
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <section className="panel budget-panel">
        <div className="panel-heading">
          <div><h2>{t.budget}</h2><p className="muted">{t.loading}</p></div>
        </div>
      </section>
    );
  }

  if (!summary || summary.totalLimitVnd === 0) {
    return (
      <section className="panel budget-panel">
        <div className="panel-heading">
          <div><h2>{t.budget}</h2><p className="muted">{t.unavailable}</p></div>
        </div>
        <div className="empty-state">{t.noData}</div>
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

      <div className="budget-ring-container">
        <svg viewBox="0 0 36 36" className="circular-chart">
          <path className="circle-bg"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path className="circle"
            strokeDasharray={`${pct}, 100`}
            stroke={strokeColor}
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <text x="18" y="20.35" className="percentage">{Math.round(pct)}%</text>
        </svg>
      </div>

      <div className="budget-stats">
        <div>
          <strong>{formatVnd(summary.totalUsedVnd, locale)}</strong>
          <span>Đã dùng</span>
        </div>
        <div>
          <strong>{formatVnd(summary.totalLimitVnd - summary.totalUsedVnd, locale)}</strong>
          <span>{t.left}</span>
        </div>
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
