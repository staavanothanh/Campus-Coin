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
import { apiGet, apiPatch, apiPost, ApiRequestError, setUnauthorizedHandler } from './api-client.js';
import { App as AuthApp, type AuthenticatedSession } from '../app/App.js';
import { formatVnd, formatDate, getCurrentMonth, getCurrentDateFormatted } from './format.js';
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
import { useCategories } from './hooks/use-categories.js';
import { ProfileCompletionScreen } from './components/ProfileCompletionScreen.js';
import { CashflowAtAGlance } from './components/CashflowAtAGlance.js';

type OAuthCallbackResult = 'google_linked' | 'google_login' | 'error';

export function App() {
  const [locale, setLocale] = useState<Locale>('vi');
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem('campus_coin_theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 800);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const sidebarRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const pageContentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function updateViewport() {
      const nextIsMobile = window.innerWidth <= 800;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) setMenuOpen(false);
    }
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (!isMobile || !menuOpen) return;

    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function getFocusableElements(container: HTMLElement) {
      return Array.from(container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )).filter(element =>
        !element.hasAttribute('disabled') &&
        !element.hasAttribute('hidden') &&
        element.getAttribute('aria-hidden') !== 'true' &&
        element.tabIndex >= 0,
      );
    }

    function keepFocusInside(event: FocusEvent) {
      const currentSidebar = sidebarRef.current;
      if (!currentSidebar || currentSidebar.contains(event.target as Node)) return;
      (getFocusableElements(currentSidebar)[0] ?? currentSidebar).focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const currentSidebar = sidebarRef.current;
      if (!currentSidebar) return;

      const focusable = getFocusableElements(currentSidebar);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        currentSidebar.focus();
        return;
      }
      if (!currentSidebar.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    sidebar.querySelector<HTMLButtonElement>('.nav-item')?.focus();
    document.addEventListener('focusin', keepFocusInside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener('focusin', keepFocusInside);
      document.removeEventListener('keydown', handleKeyDown);
      menuTriggerRef.current?.focus();
    };
  }, [isMobile, menuOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    const heading = pageContentRef.current?.querySelector<HTMLElement>('h1, h2');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [screen]);

  function closeMobileMenu() {
    setMenuOpen(false);
  }

  function toggleSidebar() {
    if (window.innerWidth <= 800) {
      setMenuOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  }

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
  const [toastDuration, setToastDuration] = useState(3000);
  const [toastKind, setToastKind] = useState<'status' | 'error'>('status');
  const [toastVersion, setToastVersion] = useState(0);
  const [authNotice, setAuthNotice] = useState('');
  const [authNoticeKind, setAuthNoticeKind] = useState<'status' | 'error'>('status');
  const [oauthCallbackResult, setOauthCallbackResult] = useState<OAuthCallbackResult | null>(null);
  const dashboardRequestRef = useRef(0);
  const localeRequestRef = useRef(0);
  const [localeSaving, setLocaleSaving] = useState(false);
  const t = copy[locale];

  function showToast(message: string, duration = 3000, alwaysShow = false, kind: 'status' | 'error' = 'status') {
    if (!notificationsEnabled && !alwaysShow) return;
    setToastMessage(message);
    setToastDuration(duration);
    setToastKind(kind);
    setToastVersion(version => version + 1);
  }

  function changeTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    try {
      localStorage.setItem('campus_coin_theme', nextTheme);
    } catch {
      // Theme vẫn áp dụng trong phiên hiện tại nếu trình duyệt chặn lưu trữ.
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get('auth');
    const callbackResult: OAuthCallbackResult | null = authResult === 'google_linked'
      ? 'google_linked'
      : authResult === 'google_login'
        ? 'google_login'
        : params.has('auth_error')
          ? 'error'
          : null;

    if (params.has('auth') || params.has('auth_error')) {
      params.delete('auth');
      params.delete('auth_error');
      const remainingQuery = params.toString();
      const cleanUrl = `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
    if (callbackResult) setOauthCallbackResult(callbackResult);
  }, []);

  useEffect(() => {
    if (!oauthCallbackResult || state === 'loading') return;

    const noticeLocale = session?.user.locale ?? locale;
    const isVerifiedLogin = oauthCallbackResult === 'google_login' && session !== null;
    const isVerifiedLink = oauthCallbackResult === 'google_linked' && session?.googleLinked === true;
    const succeeded = isVerifiedLogin || isVerifiedLink;
    const notice = succeeded
      ? oauthCallbackResult === 'google_linked'
        ? (noticeLocale === 'vi' ? 'Đã kết nối Google thành công.' : 'Google account connected successfully.')
        : (noticeLocale === 'vi' ? 'Đăng nhập Google thành công.' : 'Google sign-in successful.')
      : (noticeLocale === 'vi' ? 'Không thể hoàn tất Google. Vui lòng thử lại.' : 'Google sign-in could not be completed. Please try again.');

    setAuthNotice(notice);
    setAuthNoticeKind(succeeded ? 'status' : 'error');
    if (succeeded || state !== 'unauthenticated') showToast(notice, 3000, !succeeded, succeeded ? 'status' : 'error');
    setOauthCallbackResult(null);
  }, [oauthCallbackResult, state, session, locale]);

  useEffect(() => {
    if (!toastMessage) return;

    const timer = window.setTimeout(() => setToastMessage(null), toastDuration);
    return () => window.clearTimeout(timer);
  }, [toastMessage, toastDuration, toastVersion]);

  function toggleNotifications() {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    try {
      localStorage.setItem('notifications_enabled', String(next));
    } catch {
      // Toast preferences are optional; the current choice still applies in memory.
    }
    const message = next
      ? (locale === 'vi' ? 'Đã bật thông báo' : 'Notifications enabled')
      : (locale === 'vi' ? 'Đã tắt thông báo' : 'Notifications muted');
    showToast(message, 2500, true);
  }

  // Configure global unauthorized handler for the API client
  useEffect(() => {
    setUnauthorizedHandler(() => {
      dashboardRequestRef.current += 1;
      setSession(null);
      setDashboard(null);
      setAuthNotice('');
      setAuthNoticeKind('status');
      setState('unauthenticated');
    });
  }, []);

  async function loadDashboard(silent = false) {
    if (!session) return;
    const requestId = ++dashboardRequestRef.current;
    const sessionId = session.user.id;
    if (!silent) setState('loading');
    setError('');
    try {
      const data = await apiGet<Dashboard>('/reports/dashboard');
      if (requestId !== dashboardRequestRef.current) return;
      setDashboard(data);
      setSession(current => {
        if (!current || current.user.id !== sessionId || current.walletInitialized === Boolean(data.wallet)) return current;
        return { ...current, walletInitialized: Boolean(data.wallet) };
      });
      setState('ready');
    } catch (caught) {
      if (requestId !== dashboardRequestRef.current) return;
      if (caught instanceof ApiRequestError && caught.isUnauthorized) return;
      if (!silent) setState('error');
      setError(caught instanceof Error ? caught.message : 'REQUEST_FAILED');
    }
  }

  function handleAuthenticated(result: AuthenticatedSession | null) {
    if (!result) {
      dashboardRequestRef.current += 1;
      setSession(null);
      setDashboard(null);
      setState('unauthenticated');
      return;
    }
    const role = result.user.role === 'admin' || result.user.role === 'security' ? result.user.role : 'user';
    setSession({
      user: {
        id: String(result.user.id),
        displayName: result.user.displayName,
        hasLocalPassword: result.user.hasLocalPassword,
        requiresProfileCompletion: result.user.requiresProfileCompletion,
        email: result.user.email,
        locale: result.user.locale === 'en' ? 'en' : 'vi',
        role,
      },
      csrfToken: result.csrfToken,
      googleLinked: result.googleLinked ?? null,
      walletInitialized: false,
    });
    dashboardRequestRef.current += 1;
    setLocale(result.user.locale === 'en' ? 'en' : 'vi');
    setState('ready');
  }

  useEffect(() => {
    apiGet<Session>('/auth/session')
      .then((current) => {
        setSession(current);
        setLocale(current.user.locale);
        setState('ready');
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
    if (session) void loadDashboard(screen !== 'dashboard');
  }, [session, screen]);

  async function signOut() {
    if (!session) return;
    let clearLocalSession = false;
    try {
      await apiPost('/auth/logout', {}, { 'X-CSRF-Token': session.csrfToken });
      clearLocalSession = true;
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.isUnauthorized) {
        clearLocalSession = true;
      } else {
        showToast(locale === 'vi' ? 'Không thể đăng xuất. Vui lòng thử lại.' : 'Could not sign out. Please try again.', 3000, true, 'error');
      }
    }
    if (!clearLocalSession) return;
    dashboardRequestRef.current += 1;
    setSession(null);
    setDashboard(null);
    setAuthNotice('');
    setAuthNoticeKind('status');
    setState('unauthenticated');
  }

  async function changeLocale(nextLocale: Locale) {
    if (!session || localeSaving || session.user.locale === nextLocale) return;

    const requestId = ++localeRequestRef.current;
    const previousLocale = locale;
    setLocale(nextLocale);
    setLocaleSaving(true);

    try {
      const updatedUser = await apiPatch<Session['user']>(
        '/users/me/preferences',
        { locale: nextLocale },
        { 'X-CSRF-Token': session.csrfToken },
      );
      if (requestId !== localeRequestRef.current) return;

      const savedLocale = updatedUser.locale === 'en' ? 'en' : 'vi';
      setSession(current => current && current.user.id === session.user.id
        ? { ...current, user: updatedUser }
        : current);
      setLocale(savedLocale);
    } catch (caught) {
      if (requestId !== localeRequestRef.current) return;
      setLocale(previousLocale);
      if (caught instanceof ApiRequestError && caught.isUnauthorized) {
        setAuthNoticeKind('status');
        setAuthNotice(previousLocale === 'vi'
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : 'Your session expired. Please sign in again.');
        return;
      }
      showToast(previousLocale === 'vi'
        ? 'Không thể lưu ngôn ngữ. Vui lòng thử lại.'
        : 'Could not save the language preference. Please try again.', 3000, true, 'error');
    } finally {
      if (requestId === localeRequestRef.current) setLocaleSaving(false);
    }
  }

  function completePasswordReset() {
    dashboardRequestRef.current += 1;
    setSession(null);
    setDashboard(null);
    setFormOpen(null);
    setInitWalletOpen(false);
    setAuthNoticeKind('status');
    setAuthNotice(locale === 'vi'
      ? 'Mật khẩu đã được đổi. Vui lòng đăng nhập lại.'
      : 'Password updated. Please sign in again.');
    setState('unauthenticated');
  }

  const toast = toastMessage && (
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
    }} role={toastKind === 'error' ? 'alert' : 'status'} aria-live={toastKind === 'error' ? 'assertive' : 'polite'}>
      {notificationsEnabled ? <Bell size={16} color="#f59e0b" /> : <BellOff size={16} color="#94a3b8" />}
      <span>{toastMessage}</span>
    </div>
  );

  if (state === 'loading' && !session) return <>{toast}<StateScreen title={t.loading} detail={t.loading} /></>;
  if (state === 'unauthenticated') {
    return <>{toast}<AuthApp onAuthenticated={handleAuthenticated} initialNotice={authNotice} initialLocale={locale} noticeKind={authNoticeKind} /></>;
  }
  if (!session) return <>{toast}<StateScreen title={t.unavailable} detail={error} retry={() => window.location.reload()} retryLabel={t.retry} /></>;

  if (session.user.requiresProfileCompletion) {
    return (
      <>
        {toast}
        <ProfileCompletionScreen
          session={session}
          locale={locale}
          onComplete={(nextSession) => {
            setSession(nextSession);
            setLocale(nextSession.user.locale);
            dashboardRequestRef.current += 1;
            setState('ready');
          }}
          onSignOut={() => void signOut()}
        />
      </>
    );
  }

  return (
      <div className={`app-shell ${theme === 'dark' ? 'theme-dark' : ''}`} lang={locale}>
      {menuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
  <aside
    id="primary-sidebar"
    ref={sidebarRef}
    role={isMobile && menuOpen ? 'dialog' : undefined}
    aria-modal={isMobile && menuOpen ? true : undefined}
    aria-labelledby="primary-sidebar-title"
    aria-hidden={isMobile && !menuOpen}
    inert={isMobile && !menuOpen}
    className={`sidebar ${menuOpen ? 'is-open' : ''} ${sidebarCollapsed ? 'is-collapsed' : ''}`}
  >
        <div className="brand-lockup">
          <div className="brand-mark"><Coins size={20} strokeWidth={2.4} /></div>
          <span id="primary-sidebar-title" className="brand-text">campus<span>coin</span></span>
          <button
            type="button"
            className="sidebar-close"
            onClick={closeMobileMenu}
            aria-label={locale === 'vi' ? 'Đóng menu' : 'Close menu'}
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label={locale === 'vi' ? 'Điều hướng chính' : 'Primary navigation'}>
          <p className="nav-label">{t.workspace}</p>
          <NavItem icon={<LayoutDashboard size={18} />} label={t.dashboard} active={screen === 'dashboard'} onClick={() => { setScreen('dashboard'); setMenuOpen(false); }} />
          <NavItem icon={<CreditCard size={18} />} label={t.transactions} active={screen === 'transactions'} onClick={() => { setScreen('transactions'); setMenuOpen(false); }} />
          <NavItem icon={<WalletCards size={18} />} label={t.goals} active={screen === 'savings'} onClick={() => { setScreen('savings'); setMenuOpen(false); }} />
          <NavItem icon={<FileText size={18} />} label={t.reports} active={screen === 'reports'} onClick={() => { setScreen('reports'); setMenuOpen(false); }} />
          <p className="nav-label nav-label-spaced">{t.more}</p>
          {session.user.role === 'admin' && <NavItem icon={<CircleHelp size={18} />} label={t.admin} active={screen === 'admin'} onClick={() => { setScreen('admin'); setMenuOpen(false); }} />}
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

      <main
        className={`main-content ${sidebarCollapsed ? 'is-expanded' : ''}`}
        aria-hidden={isMobile && menuOpen}
        inert={isMobile && menuOpen}
      >
        <header className="topbar">
          <button
            ref={menuTriggerRef}
            id="menu-trigger"
            className="icon-button menu-trigger"
            aria-label={t.menu}
            aria-controls="primary-sidebar"
            aria-expanded={isMobile ? menuOpen : !sidebarCollapsed}
            onClick={toggleSidebar}
          ><Menu size={21} /></button>
          <div className="breadcrumbs"><span>{t.personal}</span><span>/</span><strong>{screen === 'dashboard' ? t.dashboard : screen === 'transactions' ? t.transactions : screen === 'savings' ? t.savings : screen === 'reports' ? t.reports : screen === 'admin' ? t.admin : screen === 'help' ? t.help : t.settingsTitle}</strong></div>
          <div className="topbar-actions">
            <button
              className="icon-button"
              onClick={toggleNotifications}
              aria-label={notificationsEnabled ? (locale === 'vi' ? 'Tắt thông báo thành công' : 'Mute success notifications') : (locale === 'vi' ? 'Bật thông báo thành công' : 'Enable success notifications')}
              title={notificationsEnabled ? (locale === 'vi' ? 'Tắt thông báo thành công trong ứng dụng; lỗi vẫn hiện.' : 'Mute in-app success notices; errors still appear.') : (locale === 'vi' ? 'Bật thông báo thành công trong ứng dụng.' : 'Enable in-app success notices.')}
            >
              {notificationsEnabled ? <Bell size={19} /> : <BellOff size={19} />}
            </button>
            <button
              type="button"
              className="locale-toggle"
              onClick={() => void changeLocale(locale === 'vi' ? 'en' : 'vi')}
              aria-label={t.language}
              aria-busy={localeSaving}
              disabled={localeSaving}
            >{locale.toUpperCase()}</button>
            <button className="icon-button" onClick={() => changeTheme(theme === 'light' ? 'dark' : 'light')} aria-label={t.appearance}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
          </div>
        </header>

        <section className="content-wrap" ref={pageContentRef}>
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
                  csrfToken={session.csrfToken}
                  locale={locale}
                  t={t}
                  onViewPlans={() => setScreen('reports')}
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
          {screen === 'help' && <HelpScreen t={t} locale={locale} csrfToken={session.csrfToken} />}
          {screen === 'settings' && (
            <SettingsScreen
              session={session}
              theme={theme}
              onThemeChange={changeTheme}
              onSessionUpdate={(newSession) => { setSession(newSession); setLocale(newSession.user.locale); }}
              onPasswordReset={completePasswordReset}
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

      {toast}
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return <button
    type="button"
    className={`nav-item ${active ? 'active' : ''}`}
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
  >{icon}<span>{label}</span>{active && <span className="active-pip" />}</button>;
}

function StateScreen({ title, detail, retry, retryLabel }: { title: string; detail: string; retry?: () => void; retryLabel?: string }) {
  return <main className="state-screen"><Coins size={30} /><h1>{title}</h1><p>{detail}</p>{retry && <button className="primary-button" onClick={retry}><RefreshCw size={16} />{retryLabel}</button>}</main>;
}

function DashboardView({
  dashboard,
  csrfToken,
  locale,
  t,
  onViewPlans,
  onIncome,
  onPayment,
  onInitWallet,
  onSetBudget,
}: {
  dashboard: Dashboard | null;
  csrfToken: string;
  locale: Locale;
  t: Copy;
  onViewPlans: () => void;
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
    {dashboard?.wallet && (
      <CashflowAtAGlance
        csrfToken={csrfToken}
        locale={locale}
        balanceVersion={dashboard.wallet.availableBalanceVnd}
        onViewPlans={onViewPlans}
      />
    )}
    <div className="dashboard-grid">
      <section className="panel activity-panel">
        <div className="panel-heading">
          <div><h2>{t.recent}</h2><p className="muted">{t.noData}</p></div>
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
        {transaction.itemName && <span>{transaction.itemName}</span>}
        {transaction.description && <span>{transaction.description}</span>}
        <span>{formatDate(transaction.occurredAt, locale)}</span>
      </div>
      <strong className={isIncome ? 'amount-positive' : ''}>{isIncome ? '+' : '-'}{formatVnd(transaction.amountVnd, locale)}</strong>
    </div>
  );
}

function BudgetPanel({ locale, t, onSetBudget }: { locale: Locale; t: Copy; onSetBudget?: (() => void) | undefined }) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setError(null);
        const month = getCurrentMonth();
        const data = await apiGet<BudgetSummary>(`/budgets/summary?month=${month}`);
        if (active) setSummary(data);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught : new Error('Failed to load budget'));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [retryCount]);

  if (loading) {
    return (
      <section className="panel budget-panel">
        <div className="panel-heading">
          <div><h2>{t.budget}</h2><p className="muted">{t.loading}</p></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel budget-panel">
        <div className="panel-heading">
          <div><h2>{t.budget}</h2><p className="muted">{t.unavailable}</p></div>
        </div>
        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 16px' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>{locale === 'vi' ? 'Không tải được ngân sách.' : 'Budget could not be loaded.'}</p>
          <button type="button" className="secondary-button" onClick={() => setRetryCount(count => count + 1)}>
            <RefreshCw size={14} />{t.retry}
          </button>
        </div>
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
