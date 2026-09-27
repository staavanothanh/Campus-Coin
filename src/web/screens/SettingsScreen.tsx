import { type FormEvent, useEffect, useState } from 'react';
import { Check, CheckCircle2, Copy, Lock, Mail, Moon, Palette, Save, ShieldCheck, Sun, User, Wallet, X } from 'lucide-react';
import { apiRequest, errorMessage } from '../api.js';
import type { Copy as Text, Locale, Session, Theme } from '../types.js';

export function SettingsScreen({ session, theme, onThemeChange, onSessionUpdate, t, locale }: {
  session: Session; theme: Theme; onThemeChange(theme: Theme): void; onSessionUpdate(session: Session): void; t: Text; locale: Locale;
}) {
  const isVi = locale === 'vi';
  const [displayName, setDisplayName] = useState(session.user.displayName);
  const [prefLocale, setPrefLocale] = useState<Locale>(session.user.locale === 'en' ? 'en' : 'vi');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const hasChanges = displayName.trim() !== session.user.displayName.trim() || prefLocale !== (session.user.locale === 'en' ? 'en' : 'vi');

  useEffect(() => {
    setDisplayName(session.user.displayName);
    setPrefLocale(session.user.locale === 'en' ? 'en' : 'vi');
  }, [session.user.displayName, session.user.locale]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !hasChanges || !displayName.trim()) return;
    setPending(true);
    setError('');
    setSuccess('');
    try {
      const user = await apiRequest<typeof session.user>('/users/me/preferences', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrfToken },
        body: JSON.stringify({ displayName: displayName.trim(), locale: prefLocale }),
      });
      onSessionUpdate({ ...session, user });
      setSuccess(t.settingsSaved);
    } catch (caught) {
      setError(errorMessage(caught, t));
    } finally {
      setPending(false);
    }
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(session.user.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(isVi ? 'Không thể sao chép mã tài khoản.' : 'Account ID could not be copied.');
    }
  }

  const role = session.user.role === 'admin' ? (isVi ? 'Quản trị viên' : 'Administrator') : session.user.role === 'security' ? (isVi ? 'Bảo mật' : 'Security') : t.personalAccount;
  return <div className="settings-page">
    <section className="settings-profile-card panel"><div className="settings-profile-left"><div className="settings-avatar">{session.user.displayName.slice(0, 2).toUpperCase()}</div><div><h2>{session.user.displayName}</h2><p className="settings-profile-email"><Mail size={14} />{session.user.email}</p></div></div><div className="settings-profile-stats"><span className="role-pill">{role}</span><button type="button" className="id-pill" onClick={() => void copyId()}><code>{session.user.id}</code>{copied ? <Check size={13} /> : <Copy size={13} />}<span className="visually-hidden">{t.userId}</span></button></div></section>
    <form onSubmit={submit} className="settings-content-grid">
      {error && <p role="alert" className="form-message">{error}</p>}{success && <p role="status" className="settings-success-alert"><CheckCircle2 size={18} />{success}</p>}
      <section className="settings-section-card panel"><div className="settings-section-header"><User size={18} /><div><h3>{isVi ? 'Thông tin tài khoản' : 'Account information'}</h3><p className="settings-section-desc">{isVi ? 'Cập nhật tên hiển thị của bạn' : 'Update your display name'}</p></div></div><div className="settings-fields-group"><label htmlFor="settings-display-name">{t.displayName}<input id="settings-display-name" value={displayName} maxLength={120} onChange={event => setDisplayName(event.target.value)} disabled={pending} required /></label><label htmlFor="settings-email"><span><Lock size={13} /> {t.accountEmail}</span><input id="settings-email" value={session.user.email} readOnly disabled /></label></div></section>
      <section className="settings-section-card panel"><div className="settings-section-header"><Palette size={18} /><div><h3>{isVi ? 'Giao diện' : 'Appearance'}</h3><p className="settings-section-desc">{isVi ? 'Chọn chế độ hiển thị' : 'Choose a display theme'}</p></div></div><div className="theme-options-grid"><button type="button" className={`theme-option-card ${theme === 'light' ? 'is-selected' : ''}`} aria-pressed={theme === 'light'} onClick={() => onThemeChange('light')}><Sun size={18} />{t.themeLight}{theme === 'light' && <Check size={15} />}</button><button type="button" className={`theme-option-card ${theme === 'dark' ? 'is-selected' : ''}`} aria-pressed={theme === 'dark'} onClick={() => onThemeChange('dark')}><Moon size={18} />{t.themeDark}{theme === 'dark' && <Check size={15} />}</button></div></section>
      <section className="settings-section-card panel"><div className="settings-section-header"><Mail size={18} /><div><h3>{isVi ? 'Ngôn ngữ' : 'Language'}</h3><p className="settings-section-desc">{isVi ? 'Thay đổi ngôn ngữ tài khoản' : 'Set your account language'}</p></div></div><div className="language-options-grid"><button type="button" className={`lang-option-card ${prefLocale === 'vi' ? 'is-selected' : ''}`} aria-pressed={prefLocale === 'vi'} disabled={pending} onClick={() => setPrefLocale('vi')}>🇻🇳 Tiếng Việt</button><button type="button" className={`lang-option-card ${prefLocale === 'en' ? 'is-selected' : ''}`} aria-pressed={prefLocale === 'en'} disabled={pending} onClick={() => setPrefLocale('en')}>🇬🇧 English</button></div></section>
      <section className="settings-section-card panel"><div className="settings-section-header"><ShieldCheck size={18} /><div><h3>{isVi ? 'Bảo mật tài khoản' : 'Account security'}</h3><p className="settings-section-desc">{session.googleLinked ? t.googleLinked : t.googleNotLinked}</p></div></div><div className="security-badges-grid"><div className="security-badge-item"><Lock size={18} /><span>{isVi ? 'Token CSRF của phiên đang hoạt động' : 'Session CSRF token active'}</span></div><div className="security-badge-item"><Wallet size={18} /><span>{isVi ? 'Ví và số dư được tải từ máy chủ' : 'Wallet balances are server-backed'}</span></div></div></section>
      <div className="settings-action-bar"><span>{hasChanges ? (isVi ? 'Có thay đổi chưa lưu' : 'Unsaved changes') : (isVi ? 'Cài đặt đã đồng bộ' : 'Settings are up to date')}</span><div className="action-bar-buttons">{hasChanges && <button type="button" className="secondary-button" onClick={() => { setDisplayName(session.user.displayName); setPrefLocale(session.user.locale === 'en' ? 'en' : 'vi'); }}>{isVi ? 'Đặt lại' : 'Reset'}</button>}<button type="submit" className="primary-button" disabled={pending || !hasChanges || !displayName.trim()}><Save size={16} />{pending ? t.submitPending : (isVi ? 'Lưu thay đổi' : 'Save changes')}</button></div></div>
    </form>
  </div>;
}
