import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError, type User } from '../features/auth/auth.api';
import { errorText, text, type Language } from './text';

type Page = 'login' | 'register' | 'verify' | 'forgot' | 'reset';
type MessageKind = 'error' | 'status';

export function App() {
  const [language, setLanguage] = useState<Language>('vi');
  const [page, setPage] = useState<Page>('login');
  const [email, setEmail] = useState(localStorage.getItem('campus_email') || '');
  const [remember, setRemember] = useState(Boolean(localStorage.getItem('campus_email')));
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [oauthResult, setOauthResult] = useState<{ kind: 'success' | 'error'; code: string } | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [messageKind, setMessageKind] = useState<MessageKind>('status');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const requestInProgress = useRef(false);
  const t = text[language];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const success = query.get('auth');
    const failure = query.get('auth_error');
    if (success) setOauthResult({ kind: 'success', code: success });
    if (failure) setOauthResult({ kind: 'error', code: failure });
    if (success || failure) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  useEffect(() => {
    if (!oauthResult) return;
    const messages = text[language];
    const successMessages: Record<string, string> = {
      google_login: messages.googleLoginSuccess,
      google_linked: messages.googleLinkSuccess,
    };
    const errorMessages: Record<string, string> = {
      cancelled: messages.googleCancelled,
      invalid_flow: messages.googleFailed,
      provider_error: messages.googleFailed,
      provider_unavailable: messages.googleUnavailable,
      link_required: messages.googleLinkRequired,
      account_conflict: messages.googleConflict,
      login_required: messages.googleLoginRequired,
      rate_limited: messages.rateLimited,
      failed: messages.googleFailed,
    };
    setMessageKind(oauthResult.kind === 'error' ? 'error' : 'status');
    setMessage(oauthResult.kind === 'error'
      ? errorMessages[oauthResult.code] || messages.googleFailed
      : successMessages[oauthResult.code] || '');
  }, [oauthResult, language]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [page, user]);

  useEffect(() => {
    api<{ google: boolean }>('/auth/providers')
      .then(result => setGoogleEnabled(result.google))
      .catch(() => setGoogleEnabled(false));
    api<{ user: User; googleLinked: boolean }>('/auth/session')
      .then(result => {
        setUser(result.user);
        setGoogleLinked(result.googleLinked);
      })
      .catch(error => {
        if (!(error instanceof ApiError) || error.status !== 401) setMessage(text.vi.error);
      });
  }, []);

  function openPage(nextPage: Page) {
    setPage(nextPage);
    setMessage('');
    setMessageKind('status');
    setPassword('');
    setConfirm('');
    setOtp('');
    setShowPassword(false);
  }

  function showError(error: unknown) {
    setMessageKind('error');
    if (error instanceof ApiError) {
      if (error.code === 'RATE_LIMITED') {
        const retryAfter = error.retryAfterSeconds;
        setMessage(retryAfter ? `${t.rateLimited} ${retryAfter} ${t.seconds}.` : t.rateLimited);
        return;
      }
      setMessage(errorText[language][error.code] || t.error);
    } else {
      setMessage(t.error);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInProgress.current) return;
    setMessage('');
    setMessageKind('status');
    if ((page === 'verify' || page === 'reset') && password !== confirm) {
      setMessage(t.mismatch);
      return;
    }

    requestInProgress.current = true;
    setBusy(true);
    try {
      if (page === 'login') {
        const result = await api<{ user: User; googleLinked: boolean }>('/auth/login', { email, password });
        setUser(result.user);
        setGoogleLinked(result.googleLinked);
        setPassword('');
        if (remember) localStorage.setItem('campus_email', email);
        else localStorage.removeItem('campus_email');
      }
      if (page === 'register') {
        await api('/auth/register', { email });
        openPage('verify');
        setMessage(t.registered);
      }
      if (page === 'verify') {
        await api('/auth/verify-registration', { email, fullName: name, otp, password, locale: language });
        openPage('login');
        setMessage(t.created);
      }
      if (page === 'forgot') {
        await api('/auth/forgot-password', { email });
        openPage('reset');
        setMessage(t.resetSent);
      }
      if (page === 'reset') {
        await api('/auth/reset-password', { email, otp, newPassword: password });
        openPage('login');
        setMessage(t.changed);
      }
    } catch (error) {
      showError(error);
    } finally {
      requestInProgress.current = false;
      setBusy(false);
    }
  }

  async function resend() {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    setBusy(true);
    setMessage('');
    setMessageKind('status');
    try {
      const purpose = page === 'verify' ? 'registration' : 'password_reset';
      await api('/auth/resend-otp', { email, purpose });
      setMessage(t.resent);
    } catch (error) {
      showError(error);
    } finally {
      requestInProgress.current = false;
      setBusy(false);
    }
  }

  async function signOut() {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    setBusy(true);
    setMessage('');
    try {
      await api('/auth/logout', {});
      setUser(null);
      setGoogleLinked(false);
      openPage('login');
    } catch (error) {
      showError(error);
    } finally {
      requestInProgress.current = false;
      setBusy(false);
    }
  }

  async function connectGoogle() {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await api<{ url: string }>('/auth/google/link', undefined, 'POST');
      window.location.assign(result.url);
    } catch (error) {
      showError(error);
      requestInProgress.current = false;
      setBusy(false);
    }
  }

  let title = t.login;
  let buttonText = t.login;
  if (page === 'register') { title = t.register; buttonText = t.sendCode; }
  if (page === 'verify') { title = t.verify; buttonText = t.create; }
  if (page === 'forgot') { title = t.forgot; buttonText = t.sendCode; }
  if (page === 'reset') { title = t.reset; buttonText = t.change; }

  return <main className="screen">
    <div className="topbar">
      <strong>Campus Coin</strong>
      <button type="button" onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}>
        {language === 'vi' ? 'English' : 'Tiếng Việt'}
      </button>
    </div>

    <section className="authCard">
      {user ? <>
        <h1 ref={headingRef} tabIndex={-1}>{t.hello} {user.displayName}</h1>
        <p>{user.email}</p>
        {googleLinked
          ? <p role="status">{t.googleConnected}</p>
          : <button className="textButton" disabled={busy} onClick={connectGoogle}>{t.googleConnect}</button>}
        <button className="primaryButton" disabled={busy} onClick={signOut}>{t.logout}</button>
      </> : <>
        <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
        {page === 'verify' && <p className="emailHint">{t.email}: {email}</p>}
        <form onSubmit={submit}>
          {(page === 'login' || page === 'register' || page === 'forgot') && <label>
            {t.email}
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" />
          </label>}

          {page === 'verify' && <label>
            {t.name}
            <input value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={120} autoComplete="name" />
          </label>}

          {(page === 'verify' || page === 'reset') && <label>
            {t.code}
            <input value={otp} onChange={event => setOtp(event.target.value)} placeholder={t.codeHint} required pattern="[0-9]{6}" inputMode="numeric" maxLength={6} />
          </label>}

          {(page === 'login' || page === 'verify' || page === 'reset') && <label>
            {page === 'reset' ? t.newPassword : t.password}
            <span className="passwordField">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder={page === 'login' ? '' : t.passwordHint} required minLength={page === 'login' ? 1 : 8} maxLength={128} autoComplete={page === 'login' ? 'current-password' : 'new-password'} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t.hide : t.show}>{showPassword ? t.hideShort : t.showShort}</button>
            </span>
          </label>}

          {(page === 'verify' || page === 'reset') && <label>
            {t.confirm}
            <input type={showPassword ? 'text' : 'password'} value={confirm} onChange={event => setConfirm(event.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" />
          </label>}

          {page === 'login' && <label className="checkLabel">
            <input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />
            {t.remember}
          </label>}

          <button className="primaryButton" disabled={busy}>{busy ? t.wait : buttonText}</button>
        </form>

        {(page === 'verify' || page === 'reset') && <button className="textButton" disabled={busy} onClick={resend}>{t.resend}</button>}
        {page === 'login' && <>
          {googleEnabled && <a className="textButton" href="/api/v1/auth/google/start">{t.googleSignIn}</a>}
          <button className="textButton" onClick={() => openPage('forgot')}>{t.forgotLink}</button>
          <button className="textButton" onClick={() => openPage('register')}>{t.signUp}</button>
        </>}
        {page !== 'login' && <button className="textButton" onClick={() => openPage('login')}>{t.back}</button>}
      </>}
      {message && <p className="message" role={messageKind === 'error' ? 'alert' : 'status'} aria-live={messageKind === 'error' ? 'assertive' : 'polite'}>{message}</p>}
    </section>
    <p className="subtitle">{t.subtitle}</p>
  </main>;
}
