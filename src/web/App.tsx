import { FormEvent, useEffect, useState } from 'react';
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

type Locale = 'vi' | 'en';
type Theme = 'light' | 'dark';
type Screen = 'dashboard' | 'transactions' | 'savings' | 'reports' | 'admin' | 'settings';

type Session = {
  user: { displayName: string; email: string; locale: Locale; role: 'user' | 'admin' | 'security' };
  walletInitialized: boolean;
  csrfToken: string;
};

type Dashboard = {
  wallet?: { availableBalanceVnd: string };
  savings?: { balanceVnd: string };
  currentMonth?: { totalIncomeVnd: string; totalPaymentVnd: string };
  recentTransactions?: Array<{ id: string; type: 'income' | 'payment'; amountVnd: string; categoryId: string; occurredAt: string }>;
};

type ApiResult<T> = { data: T };

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { credentials: 'include', ...options });
  if (!response.ok) {
    const error = new Error(`HTTP_${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  if (response.status === 204) return undefined as T;
  const result = await response.json() as ApiResult<T>;
  return result.data;
}

function formatVnd(value: string | undefined, locale: Locale): string {
  if (!value) return locale === 'vi' ? 'Chưa có dữ liệu' : 'No data';
  return `${new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(BigInt(value))} VND`;
}

function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

type Copy = {
  greeting: string;
  overview: string;
  thisMonth: string;
  balance: string;
  income: string;
  spending: string;
  savings: string;
  recent: string;
  seeAll: string;
  addTransaction: string;
  signIn: string;
  menu: string;
  dashboard: string;
  transactions: string;
  goals: string;
  settings: string;
  help: string;
  goodStart: string;
  budget: string;
  left: string;
  preview: string;
  reports: string;
  admin: string;
  signInDescription: string;
  loading: string;
  unavailable: string;
  retry: string;
  noData: string;
  signOut: string;
  addIncome: string;
  addPayment: string;
  amount: string;
  category: string;
  submit: string;
  manualCategory: string;
  savingsTransfer: string;
  settingsTitle: string;
  language: string;
  appearance: string;
  adminOnly: string;
};

const copy: Record<Locale, Copy> = {
  vi: {
    greeting: 'Chào buổi sáng, Minh',
    overview: 'Một góc nhìn rõ ràng hơn về tiền của bạn.',
    thisMonth: 'Tháng này',
    balance: 'Số dư ví',
    income: 'Thu nhập',
    spending: 'Đã chi',
    savings: 'Tiết kiệm',
    recent: 'Giao dịch gần đây',
    seeAll: 'Xem tất cả',
    addTransaction: 'Thêm giao dịch',
    signIn: 'Đăng nhập Google',
    menu: 'Mở menu',
    dashboard: 'Tổng quan',
    transactions: 'Giao dịch',
    goals: 'Mục tiêu',
    settings: 'Cài đặt',
    help: 'Trợ giúp',
    goodStart: 'Bạn đang bắt đầu rất tốt',
    budget: 'Ngân sách tháng này',
    left: 'còn lại',
    preview: 'Bản xem trước giao diện', reports: 'Báo cáo', admin: 'Quản trị', signInDescription: 'Theo dõi ví và giao dịch theo cách rõ ràng, riêng tư.', loading: 'Đang tải…', unavailable: 'Dữ liệu chưa khả dụng', retry: 'Thử lại', noData: 'Chưa có dữ liệu', signOut: 'Đăng xuất', addIncome: 'Thêm thu nhập', addPayment: 'Thêm thanh toán', amount: 'Số tiền (VND)', category: 'Danh mục', submit: 'Lưu giao dịch', manualCategory: 'Chọn danh mục thủ công', savingsTransfer: 'Chuyển tiết kiệm', settingsTitle: 'Cài đặt', language: 'Ngôn ngữ', appearance: 'Giao diện', adminOnly: 'Khu vực dành cho quản trị viên'
  },
  en: {
    greeting: 'Good morning, Minh',
    overview: 'A clearer view of where your money is going.',
    thisMonth: 'This month',
    balance: 'Wallet balance',
    income: 'Income',
    spending: 'Spent',
    savings: 'Savings',
    recent: 'Recent activity',
    seeAll: 'See all',
    addTransaction: 'Add transaction',
    signIn: 'Sign in with Google',
    menu: 'Open menu',
    dashboard: 'Overview',
    transactions: 'Transactions',
    goals: 'Goals',
    settings: 'Settings',
    help: 'Help',
    goodStart: "You're off to a good start",
    budget: 'This month’s budget',
    left: 'left',
    preview: 'Interface preview', reports: 'Reports', admin: 'Admin', signInDescription: 'A clear, private view of your wallet and activity.', loading: 'Loading…', unavailable: 'Data is unavailable', retry: 'Retry', noData: 'No data yet', signOut: 'Sign out', addIncome: 'Add income', addPayment: 'Add payment', amount: 'Amount (VND)', category: 'Category', submit: 'Save transaction', manualCategory: 'Choose category manually', savingsTransfer: 'Savings transfer', settingsTitle: 'Settings', language: 'Language', appearance: 'Appearance', adminOnly: 'Administrator area'
  }
};

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

  async function loadDashboard() {
    if (!session) return;
    setState('loading'); setError('');
    try { setDashboard(await apiRequest<Dashboard>('/reports/dashboard')); setState('ready'); }
    catch (caught) { setState('error'); setError(caught instanceof Error ? caught.message : 'REQUEST_FAILED'); }
  }

  useEffect(() => {
    apiRequest<Session>('/auth/session').then((current) => { setSession(current); setLocale(current.user.locale); }).catch((caught) => {
      const status = (caught as Error & { status?: number }).status;
      setState(status === 401 ? 'unauthenticated' : 'error'); setError(caught instanceof Error ? caught.message : 'REQUEST_FAILED');
    });
  }, []);

  useEffect(() => { if (session) void loadDashboard(); }, [session]);

  async function signOut() {
    if (!session) return;
    await apiRequest('/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': session.csrfToken } }).catch(() => undefined);
    setSession(null); setDashboard(null); setState('unauthenticated');
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
          <p className="nav-label">Workspace</p>
          <NavItem icon={<LayoutDashboard size={18} />} label={t.dashboard} active={screen === 'dashboard'} onClick={() => setScreen('dashboard')} />
          <NavItem icon={<CreditCard size={18} />} label={t.transactions} active={screen === 'transactions'} onClick={() => setScreen('transactions')} />
          <NavItem icon={<WalletCards size={18} />} label={t.goals} active={screen === 'savings'} onClick={() => setScreen('savings')} />
          <NavItem icon={<FileText size={18} />} label={t.reports} active={screen === 'reports'} onClick={() => setScreen('reports')} />
          <p className="nav-label nav-label-spaced">More</p>
          {session.user.role !== 'user' && <NavItem icon={<CircleHelp size={18} />} label={t.admin} active={screen === 'admin'} onClick={() => setScreen('admin')} />}
          <NavItem icon={<Settings size={18} />} label={t.settings} active={screen === 'settings'} onClick={() => setScreen('settings')} />
          <NavItem icon={<CircleHelp size={18} />} label={t.help} />
        </nav>

        <div className="sidebar-bottom">
          <div className="mini-profile"><div className="avatar">MN</div><div><strong>Minh Nguyen</strong><small>Personal account</small></div><ChevronDown size={16} /></div>
          <button className="google-link" onClick={() => void signOut()}>{t.signOut}</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-trigger" aria-label={t.menu} onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <div className="breadcrumbs"><span>Personal</span><span>/</span><strong>{t.dashboard}</strong></div>
          <div className="topbar-actions">
            <span className="preview-badge"><Sparkles size={14} /> {t.preview}</span>
            <button className="icon-button" aria-label="Notifications"><Bell size={19} /></button>
            <button className="locale-toggle" onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')} aria-label={t.language}>{locale.toUpperCase()}</button>
            <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={t.appearance}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
          </div>
        </header>

        <section className="content-wrap">
          <div className="page-intro"><div><p className="eyebrow">{t.thisMonth} · 09/2026</p><h1>{t.greeting.replace('Minh', session.user.displayName)}</h1><p className="muted">{t.overview}</p></div><button className="primary-button" onClick={() => setFormOpen('payment')}><Plus size={18} />{t.addTransaction}</button></div>

          {state === 'error' && <StateScreen title={t.unavailable} detail={error} retry={() => void loadDashboard()} retryLabel={t.retry} />}
          {state === 'loading' && <div className="status-panel" role="status">{t.loading}</div>}
          {state === 'ready' && screen === 'dashboard' && <DashboardView dashboard={dashboard} locale={locale} t={t} onIncome={() => setFormOpen('income')} onPayment={() => setFormOpen('payment')} />}
          {screen !== 'dashboard' && <FeatureScreen screen={screen} t={t} role={session.user.role} />}
          {formOpen && <TransactionForm kind={formOpen} csrfToken={session.csrfToken} t={t} onClose={() => setFormOpen(null)} />}
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
    <div className="stats-grid"><section className="balance-card stat-card"><div className="stat-heading"><span>{t.balance}</span><WalletCards size={18} /></div><strong>{formatVnd(dashboard?.wallet?.availableBalanceVnd, locale)}</strong><p className="muted">{t.thisMonth}</p></section><StatCard label={t.income} value={formatVnd(dashboard?.currentMonth?.totalIncomeVnd, locale)} icon={<ArrowDownLeft size={17} />} tone="mint" /><StatCard label={t.spending} value={formatVnd(dashboard?.currentMonth?.totalPaymentVnd, locale)} icon={<ArrowUpRight size={17} />} tone="coral" /><StatCard label={t.savings} value={formatVnd(dashboard?.savings?.balanceVnd, locale)} icon={<Leaf size={17} />} tone="amber" /></div>
    <div className="action-row"><button className="secondary-button" onClick={onIncome}><ArrowDownLeft size={16} />{t.addIncome}</button><button className="primary-button" onClick={onPayment}><ArrowUpRight size={16} />{t.addPayment}</button></div>
    <div className="dashboard-grid"><section className="panel activity-panel"><div className="panel-heading"><div><h2>{t.recent}</h2><p className="muted">{t.noData}</p></div></div><div className="transaction-list">{transactions.length ? transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} locale={locale} />) : <p className="empty-state">{t.noData}</p>}</div></section><BudgetPanel locale={locale} t={t} /></div>
  </>;
}

function StatCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return <section className="stat-card"><div className="stat-heading"><span>{label}</span><span className={`metric-icon ${tone}`}>{icon}</span></div><strong>{value}</strong></section>;
}

function TransactionRow({ transaction, locale }: { transaction: NonNullable<Dashboard['recentTransactions']>[number]; locale: Locale }) {
  const isIncome = transaction.type === 'income';
  return <div className="transaction-row"><div className={`transaction-icon ${isIncome ? 'mint' : 'coral'}`}>{isIncome ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</div><div className="transaction-detail"><strong>{transaction.categoryId}</strong><span>{formatDate(transaction.occurredAt, locale)}</span></div><strong className={isIncome ? 'amount-positive' : ''}>{isIncome ? '+' : '-'}{formatVnd(transaction.amountVnd, locale)}</strong></div>;
}

function BudgetPanel({ locale, t }: { locale: Locale; t: Copy }) {
  return <section className="panel budget-panel"><div className="panel-heading"><div><h2>{t.budget}</h2><p className="muted">{t.unavailable}</p></div></div><div className="empty-state">{t.noData}</div><p className="budget-note"><span className="status-dot" />{locale === 'vi' ? 'Chờ dữ liệu từ API' : 'Awaiting API data'}</p></section>;
}

function FeatureScreen({ screen, t, role }: { screen: Screen; t: Copy; role: Session['user']['role'] }) {
  const title = screen === 'transactions' ? t.transactions : screen === 'savings' ? t.savings : screen === 'reports' ? t.reports : screen === 'admin' ? t.admin : t.settingsTitle;
  return <section className="feature-panel panel"><h2>{title}</h2><p className="muted">{screen === 'admin' && role === 'user' ? t.adminOnly : t.unavailable}</p><div className="empty-state">{t.noData}</div></section>;
}

function TransactionForm({ kind, csrfToken, t, onClose }: { kind: 'income' | 'payment'; csrfToken: string; t: Copy; onClose: () => void }) {
  const [amount, setAmount] = useState(''); const [categoryId, setCategoryId] = useState(''); const [message, setMessage] = useState('');
  async function submit(event: FormEvent) { event.preventDefault(); setMessage(t.loading); try { await apiRequest('/ledger/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ type: kind, amountVnd: amount, categoryId, occurredAt: new Date().toISOString() }) }); setMessage(t.submit); } catch { setMessage(t.unavailable); } }
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}><div className="panel-heading"><h2>{kind === 'income' ? t.addIncome : t.addPayment}</h2><button type="button" className="icon-button" onClick={onClose} aria-label={t.menu}><X size={18} /></button></div><label>{t.amount}<input required inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>{t.category}<input required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} placeholder={t.manualCategory} /></label><button className="primary-button" type="submit">{t.submit}</button>{message && <p role="status" className="form-message">{message}</p>}</form></div>;
}
