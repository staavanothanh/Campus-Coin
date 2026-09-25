import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleHelp,
  CreditCard,
  FileText,
  LayoutDashboard,
  Leaf,
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

import type { Locale, Theme, Screen, Session, Dashboard, BudgetSummary } from './types.js';
import { apiGet, apiPost, setUnauthorizedHandler } from './api-client.js';
import { formatVnd, formatDate } from './format.js';
import { copy, type Copy } from './i18n.js';
import { TransactionForm } from './components/TransactionForm.js';
import { TransactionsScreen } from './screens/TransactionsScreen.js';
import { SavingsScreen } from './screens/SavingsScreen.js';
import { ReportsScreen } from './screens/ReportsScreen.js';
import { AdminScreen } from './screens/AdminScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';

export function App() {
  const [locale, setLocale] = useState<Locale>('vi');
  const [theme, setTheme] = useState<Theme>('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'error'>('loading');
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState<'income' | 'payment' | null>(null);
  const t = copy[locale];

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
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Leaf size={20} strokeWidth={2.5} /></div>
          <span>campus<span>coin</span></span>
          <button className="icon-button sidebar-close" aria-label={t.menu} onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>

        <nav aria-label="Primary navigation">
          <p className="nav-label">{t.workspace}</p>
          <NavItem icon={<LayoutDashboard size={18} />} label={t.dashboard} active={screen === 'dashboard'} onClick={() => setScreen('dashboard')} />
          <NavItem icon={<CreditCard size={18} />} label={t.transactions} active={screen === 'transactions'} onClick={() => setScreen('transactions')} />
          <NavItem icon={<WalletCards size={18} />} label={t.goals} active={screen === 'savings'} onClick={() => setScreen('savings')} />
          <NavItem icon={<FileText size={18} />} label={t.reports} active={screen === 'reports'} onClick={() => setScreen('reports')} />
          <p className="nav-label nav-label-spaced">{t.more}</p>
          {session.user.role !== 'user' && <NavItem icon={<CircleHelp size={18} />} label={t.admin} active={screen === 'admin'} onClick={() => setScreen('admin')} />}
          <NavItem icon={<Settings size={18} />} label={t.settings} active={screen === 'settings'} onClick={() => setScreen('settings')} />
          <NavItem icon={<CircleHelp size={18} />} label={t.help} />
        </nav>

        <div className="sidebar-bottom">
          <div className="mini-profile">
            <div className="avatar">{session.user.displayName.substring(0, 2).toUpperCase()}</div>
            <div><strong>{session.user.displayName}</strong><small>{t.personalAccount}</small></div>
            <ChevronDown size={16} />
          </div>
          <button className="google-link" onClick={() => void signOut()}>{t.signOut}</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-trigger" aria-label={t.menu} onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <div className="breadcrumbs"><span>{t.personal}</span><span>/</span><strong>{screen === 'dashboard' ? t.dashboard : screen === 'transactions' ? t.transactions : screen === 'savings' ? t.savings : screen === 'reports' ? t.reports : screen === 'admin' ? t.admin : t.settingsTitle}</strong></div>
          <div className="topbar-actions">
            <span className="preview-badge"><Sparkles size={14} /> {t.preview}</span>
            <button className="icon-button" aria-label="Notifications"><Bell size={19} /></button>
            <button className="locale-toggle" onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')} aria-label={t.language}>{locale.toUpperCase()}</button>
            <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={t.appearance}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
          </div>
        </header>

        <section className="content-wrap">
          <div className="page-intro">
            <div>
              <p className="eyebrow">{t.thisMonth} · 09/2026</p>
              <h1>{t.greeting.replace('{name}', session.user.displayName)}</h1>
              <p className="muted">{t.overview}</p>
            </div>
            <button className="primary-button" onClick={() => setFormOpen('payment')}><Plus size={18} />{t.addTransaction}</button>
          </div>

          {state === 'error' && <StateScreen title={t.unavailable} detail={error} retry={() => void loadDashboard()} retryLabel={t.retry} />}
          {state === 'loading' && <div className="status-panel" role="status">{t.loading}</div>}
          {state === 'ready' && screen === 'dashboard' && <DashboardView dashboard={dashboard} locale={locale} t={t} onIncome={() => setFormOpen('income')} onPayment={() => setFormOpen('payment')} />}
          {screen === 'transactions' && <TransactionsScreen t={t} locale={locale} />}
          {screen === 'savings' && <SavingsScreen csrfToken={session.csrfToken} t={t} locale={locale} />}
          {screen === 'reports' && <ReportsScreen csrfToken={session.csrfToken} t={t} locale={locale} />}
          {screen === 'admin' && <AdminScreen session={session} csrfToken={session.csrfToken} t={t} locale={locale} />}
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
            />
          )}
        </section>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{active && <span className="active-pip" />}</button>;
}

function StateScreen({ title, detail, retry, retryLabel }: { title: string; detail: string; retry?: () => void; retryLabel?: string }) {
  return <main className="state-screen"><Leaf size={30} /><h1>{title}</h1><p>{detail}</p>{retry && <button className="primary-button" onClick={retry}><RefreshCw size={16} />{retryLabel}</button>}</main>;
}

function SignInScreen({ t }: { t: Copy }) {
  return <main className="state-screen sign-in-screen"><div className="brand-mark"><Leaf size={20} /></div><h1>campus<span>coin</span></h1><p>{t.signInDescription}</p><a className="primary-button" href="/api/v1/auth/google/start"><span className="google-dot">G</span>{t.signIn}</a></main>;
}

function DashboardView({ dashboard, locale, t, onIncome, onPayment }: { dashboard: Dashboard | null; locale: Locale; t: Copy; onIncome: () => void; onPayment: () => void }) {
  const transactions = dashboard?.recentTransactions ?? [];
  return <>
    <div className="stats-grid">
      <section className="balance-card stat-card">
        <div className="stat-heading"><span>{t.balance}</span><WalletCards size={18} /></div>
        <strong>{formatVnd(dashboard?.wallet?.availableBalanceVnd, locale)}</strong>
        <p className="muted">{t.thisMonth}</p>
      </section>
      <StatCard label={t.income} value={formatVnd(dashboard?.currentMonth?.totalIncomeVnd, locale)} icon={<ArrowDownLeft size={17} />} tone="mint" />
      <StatCard label={t.spending} value={formatVnd(dashboard?.currentMonth?.totalPaymentVnd, locale)} icon={<ArrowUpRight size={17} />} tone="coral" />
      <StatCard label={t.savings} value={formatVnd(dashboard?.savings?.balanceVnd, locale)} icon={<Leaf size={17} />} tone="amber" />
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
  const strokeColor = isOverrun ? 'var(--coral-500)' : 'var(--mint-500)';

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
