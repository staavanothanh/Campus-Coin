import { useState, type FormEvent } from 'react';
import { apiPatch, ApiRequestError } from '../api-client.js';
import type { Session, Locale, Theme } from '../types.js';
import type { Copy } from '../i18n.js';
import { ErrorBanner } from '../components/ErrorBanner.js';

interface SettingsScreenProps {
  session: Session;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSessionUpdate: (session: Session) => void;
  t: Copy;
  locale: Locale;
}

export function SettingsScreen({ session, theme, onThemeChange, onSessionUpdate, t, locale }: SettingsScreenProps) {
  const [displayName, setDisplayName] = useState(session.user.displayName);
  const [prefLocale, setPrefLocale] = useState<Locale>(session.user.locale);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiRequestError | string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    
    setError(null);
    setSuccessMsg('');
    setLoading(true);

    try {
      const updatedUser = await apiPatch<Session['user']>(
        '/users/me/preferences', 
        { 
          displayName: displayName.trim(),
          locale: prefLocale,
        }, 
        { 'X-CSRF-Token': session.csrfToken }
      );
      
      onSessionUpdate({
        ...session,
        user: updatedUser
      });

      setSuccessMsg(prefLocale === 'vi' ? 'Đã lưu thay đổi' : 'Changes saved successfully');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err);
      } else {
        setError(t.serverError);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="feature-panel panel">
      <div className="panel-heading">
        <div>
          <h2>{t.settingsTitle}</h2>
          <p className="muted">{t.personalAccount}</p>
        </div>
      </div>

      <form onSubmit={submit} className="settings-form" style={{ maxWidth: '400px', marginTop: 'var(--space-4)' }}>
        <ErrorBanner error={error instanceof ApiRequestError ? error.apiError : error} locale={locale} />
        
        {successMsg && (
          <div className="budget-warning-banner" style={{ background: 'var(--mint-500)', color: 'white', marginBottom: 'var(--space-4)' }} role="status">
            <p>{successMsg}</p>
          </div>
        )}

        <label>
          Tên hiển thị
          <input
            required
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            maxLength={50}
          />
        </label>

        <label>
          {t.language}
          <select
            value={prefLocale}
            onChange={(e) => setPrefLocale(e.target.value as Locale)}
            disabled={loading}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </label>
        
        <label>
          {t.appearance}
          <select
            value={theme}
            onChange={(e) => onThemeChange(e.target.value as Theme)}
            disabled={loading}
          >
            <option value="light">{locale === 'vi' ? 'Sáng' : 'Light'}</option>
            <option value="dark">{locale === 'vi' ? 'Tối' : 'Dark'}</option>
          </select>
          <small className="muted">
            {locale === 'vi' ? 'Chỉ áp dụng trên thiết bị này' : 'Applies to this device only'}
          </small>
        </label>

        <div style={{ marginTop: 'var(--space-6)' }}>
          <button
            className="primary-button"
            type="submit"
            disabled={loading || !displayName.trim()}
          >
            {loading ? t.loading : (locale === 'vi' ? 'Lưu thay đổi' : 'Save changes')}
          </button>
        </div>
      </form>
    </section>
  );
}
