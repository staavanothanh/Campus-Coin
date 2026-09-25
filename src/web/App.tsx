import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  Leaf,
  Menu,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
  WalletCards,
  X
} from 'lucide-react';

type Locale = 'vi' | 'en';
type Theme = 'light' | 'dark';

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
    preview: 'Bản xem trước giao diện'
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
    preview: 'Interface preview'
  }
};

const transactions = [
  { title: 'Cà phê sáng', category: 'Ăn uống', amount: '-35.000 đ', time: 'Hôm nay, 08:42', icon: CoffeeIcon, tone: 'coral' },
  { title: 'Freelance design', category: 'Thu nhập', amount: '+2.400.000 đ', time: 'Hôm qua, 16:10', icon: ArrowDownLeft, tone: 'mint' },
  { title: 'Vé xe buýt tháng', category: 'Di chuyển', amount: '-120.000 đ', time: '12 Thg 9, 09:15', icon: BusIcon, tone: 'amber' }
];

function CoffeeIcon() {
  return <span aria-hidden="true">☕</span>;
}

function BusIcon() {
  return <span aria-hidden="true">▣</span>;
}

export function App() {
  const [locale, setLocale] = useState<Locale>('vi');
  const [theme, setTheme] = useState<Theme>('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const t = copy[locale];

  return (
    <div className={`app-shell ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Leaf size={20} strokeWidth={2.5} /></div>
          <span>campus<span>coin</span></span>
          <button className="icon-button sidebar-close" aria-label={t.menu} onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>

        <nav aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          <NavItem icon={<LayoutDashboard size={18} />} label={t.dashboard} active />
          <NavItem icon={<CreditCard size={18} />} label={t.transactions} />
          <NavItem icon={<WalletCards size={18} />} label={t.goals} />
          <p className="nav-label nav-label-spaced">More</p>
          <NavItem icon={<Settings size={18} />} label={t.settings} />
          <NavItem icon={<CircleHelp size={18} />} label={t.help} />
        </nav>

        <div className="sidebar-bottom">
          <div className="mini-profile"><div className="avatar">MN</div><div><strong>Minh Nguyen</strong><small>Personal account</small></div><ChevronDown size={16} /></div>
          <a className="google-link" href="/api/v1/auth/google/start"><span className="google-dot">G</span>{t.signIn}</a>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-trigger" aria-label={t.menu} onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <div className="breadcrumbs"><span>Personal</span><span>/</span><strong>{t.dashboard}</strong></div>
          <div className="topbar-actions">
            <span className="preview-badge"><Sparkles size={14} /> {t.preview}</span>
            <button className="icon-button" aria-label="Notifications"><Bell size={19} /></button>
            <button className="locale-toggle" onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')} aria-label="Change language">{locale.toUpperCase()}</button>
            <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Change theme">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
          </div>
        </header>

        <section className="content-wrap">
          <div className="page-intro"><div><p className="eyebrow">{t.thisMonth} · 09/2026</p><h1>{t.greeting}</h1><p className="muted">{t.overview}</p></div><button className="primary-button"><Plus size={18} />{t.addTransaction}</button></div>

          <div className="stats-grid">
            <section className="balance-card stat-card"><div className="stat-heading"><span>{t.balance}</span><WalletCards size={18} /></div><strong>8.450.000 <small>đ</small></strong><div className="trend positive"><ArrowUpRight size={15} /> 12,8% <span>vs. tháng trước</span></div><div className="balance-line"><span style={{ width: '68%' }} /></div></section>
            <StatCard label={t.income} value="12.400.000 đ" change="+8,2%" icon={<ArrowDownLeft size={17} />} tone="mint" />
            <StatCard label={t.spending} value="3.950.000 đ" change="-4,6%" icon={<ArrowUpRight size={17} />} tone="coral" />
            <StatCard label={t.savings} value="2.100.000 đ" change="+15,4%" icon={<Leaf size={17} />} tone="amber" />
          </div>

          <div className="dashboard-grid">
            <section className="panel activity-panel"><div className="panel-heading"><div><h2>{t.recent}</h2><p className="muted">Các khoản mới nhất trong ví của bạn</p></div><button className="text-button">{t.seeAll}<ArrowUpRight size={15} /></button></div><div className="transaction-list">{transactions.map((transaction) => <TransactionRow key={transaction.title} {...transaction} />)}</div></section>
            <section className="panel budget-panel"><div className="panel-heading"><div><h2>{t.budget}</h2><p className="muted">Ăn uống & di chuyển</p></div><button className="icon-button"><ChevronDown size={17} /></button></div><div className="budget-ring"><div><strong>64%</strong><span>đã dùng</span></div></div><div className="budget-summary"><strong>1.280.000 đ</strong><span>2.000.000 đ</span></div><div className="budget-progress"><span /></div><p className="budget-note"><span className="status-dot" /> 720.000 đ {t.left}</p></section>
          </div>

          <section className="insight-strip"><div className="insight-icon"><Sparkles size={20} /></div><div><strong>{t.goodStart}</strong><p>Chi tiêu của bạn đang thấp hơn 18% so với trung bình ba tháng gần nhất.</p></div><ArrowUpRight size={18} /></section>
        </section>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return <button className={`nav-item ${active ? 'active' : ''}`}>{icon}<span>{label}</span>{active && <span className="active-pip" />}</button>;
}

function StatCard({ label, value, change, icon, tone }: { label: string; value: string; change: string; icon: React.ReactNode; tone: string }) {
  return <section className="stat-card"><div className="stat-heading"><span>{label}</span><span className={`metric-icon ${tone}`}>{icon}</span></div><strong>{value}</strong><div className={`trend ${tone === 'coral' ? 'negative' : 'positive'}`}>{change}<span> so với tháng trước</span></div></section>;
}

function TransactionRow({ title, category, amount, time, icon: Icon, tone }: (typeof transactions)[number]) {
  return <div className="transaction-row"><div className={`transaction-icon ${tone}`}><Icon /></div><div className="transaction-detail"><strong>{title}</strong><span>{category} · {time}</span></div><strong className={amount.startsWith('+') ? 'amount-positive' : ''}>{amount}</strong></div>;
}
